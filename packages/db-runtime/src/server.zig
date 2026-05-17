const std = @import("std");
const Io = std.Io;
const net = Io.net;
const graph_store = @import("graph_store.zig");
const storage_mod = @import("storage.zig");
const util = @import("util/util.zig");

const Server = @This();

const max_body_size: usize = 10 * 1024 * 1024;
const header_scratch_size: usize = 16 * 1024;

allocator: std.mem.Allocator,
io: Io,
graph: *graph_store.GraphStore,
storage_engine: storage_mod.Engine,

pub fn init(allocator: std.mem.Allocator, io: Io, graph: *graph_store.GraphStore, storage_engine: storage_mod.Engine) Server {
    return .{ .allocator = allocator, .io = io, .graph = graph, .storage_engine = storage_engine };
}

pub fn handleConnection(self: *Server, stream: net.Stream) void {
    const io = self.io;
    defer stream.close(io);

    var arena = std.heap.ArenaAllocator.init(self.allocator);
    defer arena.deinit();
    const alloc = arena.allocator();

    var read_buf: [4096]u8 = undefined;
    var reader = stream.reader(io, &read_buf);

    const header_scratch = alloc.alloc(u8, header_scratch_size) catch return;
    var total: usize = 0;
    var header_end: usize = 0;

    while (total < header_scratch.len) {
        var slices: [1][]u8 = .{header_scratch[total..]};
        const n = reader.interface.readVec(&slices) catch return;
        if (n == 0) return;
        total += n;
        if (std.mem.indexOf(u8, header_scratch[0..total], "\r\n\r\n")) |idx| {
            header_end = idx;
            break;
        }
    }
    if (header_end == 0) return;

    const first_line_end = std.mem.indexOf(u8, header_scratch[0..header_end], "\r\n") orelse return;
    const first_line = header_scratch[0..first_line_end];
    const headers = header_scratch[first_line_end + 2 .. header_end];

    var parts = std.mem.splitScalar(u8, first_line, ' ');
    const method = parts.next() orelse return;
    const path_with_query = parts.next() orelse return;
    const path = if (std.mem.indexOfScalar(u8, path_with_query, '?')) |q|
        path_with_query[0..q]
    else
        path_with_query;

    const content_length = parseContentLength(headers);
    if (content_length > max_body_size) {
        sendStatus(stream, io, .payload_too_large, "{\"message\":\"Body too large\"}");
        return;
    }

    const body_start = header_end + 4;
    const pre_read = total - body_start;

    const body = alloc.alloc(u8, content_length) catch {
        sendStatus(stream, io, .internal_server_error, "{\"message\":\"Out of memory\"}");
        return;
    };

    if (pre_read > 0) {
        const take = @min(pre_read, content_length);
        @memcpy(body[0..take], header_scratch[body_start .. body_start + take]);
    }

    var body_filled: usize = @min(pre_read, content_length);
    while (body_filled < content_length) {
        var slices: [1][]u8 = .{body[body_filled..]};
        const n = reader.interface.readVec(&slices) catch return;
        if (n == 0) break;
        body_filled += n;
    }
    if (body_filled < content_length) return;

    self.route(stream, method, path, headers, body, alloc) catch |err| {
        std.log.err("handler error: {s}", .{@errorName(err)});
        sendStatus(stream, io, .internal_server_error, "{\"message\":\"Internal error\"}");
    };
}

fn route(
    self: *Server,
    stream: net.Stream,
    method: []const u8,
    path: []const u8,
    headers: []const u8,
    body: []const u8,
    alloc: std.mem.Allocator,
) !void {
    const is_post = std.mem.eql(u8, method, "POST");

    if (std.mem.eql(u8, method, "GET") and std.mem.eql(u8, path, "/")) {
        sendStatus(stream, self.io, .ok, "{\"message\":\"Server running\"}");
    } else if (std.mem.eql(u8, path, "/push") and !is_post) {
        sendStatus(stream, self.io, .method_not_allowed, "{\"error\":\"Method not allowed\"}");
    } else if (std.mem.eql(u8, path, "/pull") and !is_post) {
        sendStatus(stream, self.io, .method_not_allowed, "{\"error\":\"Method not allowed\"}");
    } else if ((std.mem.eql(u8, path, "/push") or std.mem.eql(u8, path, "/pull")) and !hasJsonContentType(headers)) {
        sendStatus(stream, self.io, .bad_request, "{\"error\":\"Invalid content type\"}");
    } else if (is_post and std.mem.eql(u8, path, "/push")) {
        try self.handlePush(stream, body, alloc);
    } else if (is_post and std.mem.eql(u8, path, "/pull")) {
        try self.handlePull(stream, body, alloc);
    } else {
        sendStatus(stream, self.io, .not_found, "{\"message\":\"Not found\"}");
    }
}

fn handlePush(self: *Server, stream: net.Stream, body: []const u8, alloc: std.mem.Allocator) !void {
    const io = self.io;

    var parsed = std.json.parseFromSlice(std.json.Value, alloc, body, .{}) catch {
        sendStatus(stream, io, .bad_request, "{\"message\":\"Invalid JSON\"}");
        return;
    };
    defer parsed.deinit();

    const obj = switch (parsed.value) {
        .object => |o| o,
        else => {
            sendStatus(stream, io, .bad_request, "{\"message\":\"Request body must be a JSON object\"}");
            return;
        },
    };

    std.log.info("PUSH received JSON with {} keys", .{obj.count()});
    util.dumpJsonValue("PUSH entry", std.json.Value{ .object = obj });

    try self.storage_engine.appendPush(obj);

    {
        self.graph.lock();
        defer self.graph.unlock();
        self.graph.applyPush(obj);
    }

    util.dumpJsonValue("PUSH nodes", std.json.Value{ .object = self.graph.nodes.map });
    util.dumpJsonValue("PUSH edges", std.json.Value{ .object = self.graph.edges.map });

    sendStatus(stream, io, .ok, "{\"message\":\"Data received successfully\"}");
}

fn handlePull(self: *Server, stream: net.Stream, body: []const u8, alloc: std.mem.Allocator) !void {
    const io = self.io;

    var parsed = std.json.parseFromSlice(std.json.Value, alloc, body, .{}) catch {
        sendStatus(stream, io, .bad_request, "{\"message\":\"Invalid JSON\"}");
        return;
    };
    defer parsed.deinit();

    util.dumpJsonValue("PULL nodes", std.json.Value{ .object = self.graph.nodes.map });
    util.dumpJsonValue("PULL edges", std.json.Value{ .object = self.graph.edges.map });

    const obj = switch (parsed.value) {
        .object => |o| o,
        else => {
            sendStatus(stream, io, .bad_request, "{\"message\":\"Request body must be a JSON object\"}");
            return;
        },
    };

    std.log.info("PULL received JSON with {} keys", .{obj.count()});

    var result: std.json.ObjectMap = .empty;
    {
        self.graph.lock();
        defer self.graph.unlock();

        var query_it = obj.iterator();
        while (query_it.next()) |query_entry| {
            const node_id = query_entry.key_ptr.*;
            switch (query_entry.value_ptr.*) {
                .object => |query_props| {
                    const node_result = self.graph.query(node_id, query_props, alloc) catch |err| {
                        std.debug.print("Query error for node {s}: {any}\n", .{ node_id, err });
                        continue;
                    };
                    result.put(alloc, node_id, std.json.Value{ .object = node_result }) catch |err| {
                        std.debug.print("Error adding result for node {s}: {any}\n", .{ node_id, err });
                    };
                },
                else => {
                    std.debug.print("Query for node {s} is not an object, skipping\n", .{node_id});
                },
            }
        }
    }

    var alist = Io.Writer.Allocating.init(alloc);
    defer alist.deinit();
    const json_fmt = std.json.fmt(std.json.Value{ .object = result }, .{});
    try json_fmt.format(&alist.writer);

    sendStatus(stream, io, .ok, alist.writer.buffered());
}

fn sendStatus(stream: net.Stream, io: Io, status: std.http.Status, body: []const u8) void {
    var header_buf: [256]u8 = undefined;
    const status_line = statusLine(status);
    const headers = std.fmt.bufPrint(
        &header_buf,
        "HTTP/1.1 {s}\r\nContent-Type: application/json\r\nContent-Length: {d}\r\nConnection: close\r\n\r\n",
        .{ status_line, body.len },
    ) catch return;

    var write_buf: [4096]u8 = undefined;
    var writer = stream.writer(io, &write_buf);
    writer.interface.writeAll(headers) catch return;
    writer.interface.writeAll(body) catch return;
    writer.interface.flush() catch return;
}

fn statusLine(status: std.http.Status) []const u8 {
    return switch (status) {
        .ok => "200 OK",
        .bad_request => "400 Bad Request",
        .not_found => "404 Not Found",
        .method_not_allowed => "405 Method Not Allowed",
        .payload_too_large => "413 Payload Too Large",
        .internal_server_error => "500 Internal Server Error",
        else => "500 Internal Server Error",
    };
}

fn parseContentLength(headers: []const u8) usize {
    var lines = std.mem.splitSequence(u8, headers, "\r\n");
    while (lines.next()) |line| {
        if (asciiStartsWithIgnoreCase(line, "content-length:")) {
            const value = std.mem.trim(u8, line["content-length:".len..], " ");
            return std.fmt.parseInt(usize, value, 10) catch 0;
        }
    }
    return 0;
}

fn asciiStartsWithIgnoreCase(haystack: []const u8, needle: []const u8) bool {
    if (haystack.len < needle.len) return false;
    for (haystack[0..needle.len], needle) |h, n| {
        if (std.ascii.toLower(h) != std.ascii.toLower(n)) return false;
    }
    return true;
}

fn hasJsonContentType(headers: []const u8) bool {
    var lines = std.mem.splitSequence(u8, headers, "\r\n");
    while (lines.next()) |line| {
        if (asciiStartsWithIgnoreCase(line, "content-type:")) {
            const value = std.mem.trim(u8, line["content-type:".len..], " ");
            return std.mem.indexOf(u8, value, "application/json") != null;
        }
    }
    return false;
}

test "parseContentLength" {
    try std.testing.expectEqual(@as(usize, 42), parseContentLength("Host: localhost\r\nContent-Length: 42\r\nAccept: */*"));
    try std.testing.expectEqual(@as(usize, 0), parseContentLength("Host: localhost\r\nAccept: */*"));
}
