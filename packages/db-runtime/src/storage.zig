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
        appendPush: *const fn (ptr: *anyopaque, body: std.json.ObjectMap) anyerror!void,
        checkpoint: *const fn (ptr: *anyopaque, graph: *graph_store.GraphStore) anyerror!void,
        deinit: *const fn (ptr: *anyopaque) void,
    };

    pub fn load(self: Engine, graph: *graph_store.GraphStore) !void {
        try self.vtable.load(self.ptr, graph);
    }

    pub fn appendPush(self: Engine, body: std.json.ObjectMap) !void {
        try self.vtable.appendPush(self.ptr, body);
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

    fn appendPush(ptr: *anyopaque, body: std.json.ObjectMap) !void {
        _ = ptr;
        _ = body;
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

    const Self = @This();

    pub fn init(allocator: std.mem.Allocator, io: Io) Self {
        return .{
            .allocator = allocator,
            .io = io,
            .mutex = .init,
        };
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

        var lines = std.mem.splitScalar(u8, content, '\n');
        while (lines.next()) |line| {
            const trimmed = std.mem.trim(u8, line, " \t\r");
            if (trimmed.len == 0) continue;

            {
                var parsed = try std.json.parseFromSlice(std.json.Value, self.allocator, trimmed, .{});
                defer parsed.deinit();

                const body = switch (parsed.value) {
                    .object => |object| object,
                    else => return error.InvalidWalEntry,
                };

                graph.lock();
                defer graph.unlock();
                graph.applyPush(body);
            }
        }
    }

    fn appendPush(ptr: *anyopaque, body: std.json.ObjectMap) !void {
        const self: *Self = @ptrCast(@alignCast(ptr));
        self.mutex.lockUncancelable(self.io);
        defer self.mutex.unlock(self.io);

        var payload = Io.Writer.Allocating.init(self.allocator);
        defer payload.deinit();

        const json_fmt = std.json.fmt(std.json.Value{ .object = body }, .{});
        try json_fmt.format(&payload.writer);
        try payload.writer.writeByte('\n');

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
        try writer.interface.writeAll(payload.written());
        try writer.interface.flush();
        try file.sync(self.io);
    }

    fn checkpoint(ptr: *anyopaque, graph: *graph_store.GraphStore) !void {
        _ = ptr;
        _ = graph;
    }

    fn deinit(ptr: *anyopaque) void {
        _ = ptr;
    }
};
