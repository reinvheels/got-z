const std = @import("std");
const Io = std.Io;
const graph_store = @import("graph_store.zig");

const wal_file_name = "got-z.wal";
const max_wal_bytes = 1024 * 1024 * 1024;

pub const Engine = struct {
    ptr: *anyopaque,
    vtable: *const VTable,

    pub const VTable = struct {
        load: *const fn (ptr: *anyopaque, graph: *graph_store.GraphStore) anyerror!void,
        appendPush: *const fn (ptr: *anyopaque, body: std.json.ObjectMap, raw_body: []const u8) anyerror!void,
        checkpoint: *const fn (ptr: *anyopaque, graph: *graph_store.GraphStore) anyerror!void,
        deinit: *const fn (ptr: *anyopaque) void,
    };

    pub fn load(self: Engine, graph: *graph_store.GraphStore) !void {
        try self.vtable.load(self.ptr, graph);
    }

    pub fn appendPush(self: Engine, body: std.json.ObjectMap, raw_body: []const u8) !void {
        try self.vtable.appendPush(self.ptr, body, raw_body);
    }

    pub fn checkpoint(self: Engine, graph: *graph_store.GraphStore) !void {
        try self.vtable.checkpoint(self.ptr, graph);
    }

    pub fn deinit(self: Engine) void {
        self.vtable.deinit(self.ptr);
    }
};

pub const NoopEngine = struct {
    const Self = @This();

    pub fn engine(self: *Self) Engine {
        return .{
            .ptr = self,
            .vtable = &.{
                .load = load,
                .appendPush = appendPush,
                .checkpoint = checkpoint,
                .deinit = deinit,
            },
        };
    }

    fn load(ptr: *anyopaque, graph: *graph_store.GraphStore) !void {
        _ = ptr;
        _ = graph;
    }

    fn appendPush(ptr: *anyopaque, body: std.json.ObjectMap, raw_body: []const u8) !void {
        _ = ptr;
        _ = body;
        _ = raw_body;
    }

    fn checkpoint(ptr: *anyopaque, graph: *graph_store.GraphStore) !void {
        _ = ptr;
        _ = graph;
    }

    fn deinit(ptr: *anyopaque) void {
        _ = ptr;
    }
};

pub const JsonWalEngine = struct {
    allocator: std.mem.Allocator,
    io: Io,
    mutex: Io.Mutex,
    condition: Io.Condition,
    pending: std.ArrayList([]u8),
    writer_thread: ?std.Thread,
    stopping: bool,
    write_error: ?anyerror,

    const Self = @This();

    pub fn init(allocator: std.mem.Allocator, io: Io) Self {
        return .{
            .allocator = allocator,
            .io = io,
            .mutex = .init,
            .condition = .init,
            .pending = .empty,
            .writer_thread = null,
            .stopping = false,
            .write_error = null,
        };
    }

    pub fn start(self: *Self) !void {
        if (self.writer_thread != null) return;
        self.writer_thread = try std.Thread.spawn(.{ .allocator = self.allocator }, writerMain, .{self});
    }

    pub fn engine(self: *Self) Engine {
        return .{
            .ptr = self,
            .vtable = &.{
                .load = load,
                .appendPush = appendPush,
                .checkpoint = checkpoint,
                .deinit = deinit,
            },
        };
    }

    fn load(ptr: *anyopaque, graph: *graph_store.GraphStore) !void {
        const self: *Self = @ptrCast(@alignCast(ptr));
        const cwd = Io.Dir.cwd();
        var file = cwd.openFile(self.io, wal_file_name, .{}) catch |err| switch (err) {
            error.FileNotFound => return,
            else => return err,
        };
        defer file.close(self.io);

        const stat = try file.stat(self.io);
        if (stat.size > max_wal_bytes) return error.WalTooLarge;

        var read_buffer: [4096]u8 = undefined;
        var reader = file.reader(self.io, &read_buffer);
        const content = try reader.interface.readAlloc(self.allocator, @intCast(stat.size));
        defer self.allocator.free(content);

        const trimmed = std.mem.trimStart(u8, content, " \t\r\n");
        if (trimmed.len == 0) return;

        if (std.ascii.isDigit(trimmed[0])) {
            try self.replayFramed(content[content.len - trimmed.len ..], graph);
        } else {
            try self.replayJsonLines(content, graph);
        }
    }

    fn replayJsonLines(self: *Self, content: []const u8, graph: *graph_store.GraphStore) !void {
        var lines = std.mem.splitScalar(u8, content, '\n');
        while (lines.next()) |line| {
            const trimmed = std.mem.trim(u8, line, " \t\r");
            if (trimmed.len == 0) continue;

            try self.applyWalBody(trimmed, graph);
        }
    }

    fn replayFramed(self: *Self, content: []const u8, graph: *graph_store.GraphStore) !void {
        var index: usize = 0;
        while (index < content.len) {
            const line_end = std.mem.indexOfScalarPos(u8, content, index, '\n') orelse return;
            const length_text = std.mem.trim(u8, content[index..line_end], " \t\r");
            if (length_text.len == 0) {
                index = line_end + 1;
                continue;
            }

            const body_len = try std.fmt.parseInt(usize, length_text, 10);
            const body_start = line_end + 1;
            const body_end = body_start + body_len;
            if (body_end > content.len) return;

            try self.applyWalBody(content[body_start..body_end], graph);

            index = body_end;
            if (index < content.len) {
                if (content[index] != '\n') return error.InvalidWalFrame;
                index += 1;
            }
        }
    }

    fn applyWalBody(self: *Self, body_bytes: []const u8, graph: *graph_store.GraphStore) !void {
        var parsed = try std.json.parseFromSlice(std.json.Value, self.allocator, body_bytes, .{});
        defer parsed.deinit();

        const body = switch (parsed.value) {
            .object => |object| object,
            else => return error.InvalidWalEntry,
        };

        graph.lock();
        defer graph.unlock();
        graph.applyPush(body);
    }

    fn appendPush(ptr: *anyopaque, body: std.json.ObjectMap, raw_body: []const u8) !void {
        const self: *Self = @ptrCast(@alignCast(ptr));
        _ = body;
        const entry = try self.allocator.dupe(u8, raw_body);
        errdefer self.allocator.free(entry);

        self.mutex.lockUncancelable(self.io);
        defer self.mutex.unlock(self.io);

        if (self.write_error) |err| return err;
        try self.pending.append(self.allocator, entry);
        self.condition.signal(self.io);
    }

    fn writeEntries(self: *Self, entries: []const []u8) !void {
        const cwd = Io.Dir.cwd();
        var file = try cwd.createFile(self.io, wal_file_name, .{
            .read = true,
            .truncate = false,
        });
        defer file.close(self.io);

        const stat = try file.stat(self.io);
        var write_buffer: [4096]u8 = undefined;
        var writer = file.writer(self.io, &write_buffer);
        try writer.seekTo(stat.size);
        for (entries) |entry| {
            var header_buffer: [32]u8 = undefined;
            const header = try std.fmt.bufPrint(&header_buffer, "{d}\n", .{entry.len});
            try writer.interface.writeAll(header);
            try writer.interface.writeAll(entry);
            try writer.interface.writeByte('\n');
        }
        try writer.interface.flush();
        try file.sync(self.io);
    }

    fn writerMain(self: *Self) void {
        self.writerLoop() catch |err| {
            std.log.err("WAL writer failed: {s}", .{@errorName(err)});
            self.mutex.lockUncancelable(self.io);
            defer self.mutex.unlock(self.io);
            self.write_error = err;
            self.condition.broadcast(self.io);
        };
    }

    fn writerLoop(self: *Self) !void {
        while (true) {
            self.mutex.lockUncancelable(self.io);
            while (self.pending.items.len == 0 and !self.stopping and self.write_error == null) {
                self.condition.waitUncancelable(self.io, &self.mutex);
            }

            if (self.pending.items.len == 0 and self.stopping) {
                self.mutex.unlock(self.io);
                return;
            }

            var batch = self.pending;
            self.pending = .empty;
            self.mutex.unlock(self.io);

            defer {
                for (batch.items) |entry| self.allocator.free(entry);
                batch.deinit(self.allocator);
            }
            try self.writeEntries(batch.items);
        }
    }

    fn checkpoint(ptr: *anyopaque, graph: *graph_store.GraphStore) !void {
        _ = ptr;
        _ = graph;
    }

    fn deinit(ptr: *anyopaque) void {
        const self: *Self = @ptrCast(@alignCast(ptr));
        self.mutex.lockUncancelable(self.io);
        self.stopping = true;
        self.condition.broadcast(self.io);
        self.mutex.unlock(self.io);

        if (self.writer_thread) |thread| {
            thread.join();
            self.writer_thread = null;
        }

        for (self.pending.items) |entry| self.allocator.free(entry);
        self.pending.deinit(self.allocator);
    }
};
