const std = @import("std");
const httpz = @import("httpz");
const graph_store = @import("graph_store.zig");
const httpz_util = @import("util/httpz_util.zig");
const util = @import("util/util.zig");

var graph: graph_store.GraphStore = undefined;

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    const allocator = gpa.allocator();

    graph = graph_store.GraphStore.init(allocator);

    // More advance cases will use a custom "Handler" instead of "void".
    // The last parameter is our handler instance, since we have a "void"
    // handler, we passed a void ({}) value.
    var server = try httpz.Server(void).init(allocator, .{ .port = 3001 }, {});
    defer {
        // clean shutdown, finishes serving any live request
        server.stop();
        server.deinit();
        graph.deinit();
    }

    var router = try server.router(.{});
    router.post("/push", push, .{});
    router.post("/pull", pull, .{});

    // blocks
    try server.listen();
}

fn push(req: *httpz.Request, res: *httpz.Response) !void {
    const body = try httpz_util.parseJsonRequest(req, res) orelse return;
    const obj = switch (body) {
        .object => |obj| obj,
        else => {
            std.debug.print("PUSH request body is not an object\n", .{});
            res.status = 400;
            try res.json(.{ .message = "Request body must be a JSON object" }, .{});
            return;
        },
    };
    std.log.info("PUSH received JSON with {} keys", .{obj.count()});
    util.dumpJsonValue("PUSH entry", std.json.Value{ .object = obj });

    var iterator = obj.iterator();
    while (iterator.next()) |entry| {
        switch (entry.value_ptr.*) {
            .object => |node_body| {
                graph.upsertNode(entry.key_ptr.*, node_body) catch |err| {
                    std.debug.print("Error adding node {s}: {any}\n", .{ entry.key_ptr.*, err });
                    continue;
                };
            },
            else => {
                std.debug.print("Value for key {s} is not an object, skipping\n", .{entry.key_ptr.*});
            },
        }
    }

    res.status = 200;
    try res.json(.{ .message = "Data received successfully" }, .{});
}

fn pull(req: *httpz.Request, res: *httpz.Response) !void {
    const body = try httpz_util.parseJsonRequest(req, res) orelse return;

    const obj = switch (body) {
        .object => |obj| obj,
        else => {
            std.debug.print("PULL request body is not an object\n", .{});
            res.status = 400;
            try res.json(.{ .message = "Request body must be a JSON object" }, .{});
            return;
        },
    };
    std.log.info("PULL received JSON with {} keys", .{obj.count()});

    var result = std.json.ObjectMap.init(req.arena);
    var query_iterator = obj.iterator();
    while (query_iterator.next()) |query_entry| {
        const node_id = query_entry.key_ptr.*;

        switch (query_entry.value_ptr.*) {
            .object => |query_props| {
                const node_result = graph.query(node_id, query_props, req.arena) catch |err| {
                    std.debug.print("Query error for node {s}: {any}\n", .{ node_id, err });
                    continue;
                };
                result.put(node_id, std.json.Value{ .object = node_result }) catch |err| {
                    std.debug.print("Error adding result for node {s}: {any}\n", .{ node_id, err });
                };
            },
            else => {
                std.debug.print("Query for node {s} is not an object, skipping\n", .{node_id});
            },
        }
    }

    res.status = 200;
    try res.json(std.json.Value{ .object = result }, .{});
}
