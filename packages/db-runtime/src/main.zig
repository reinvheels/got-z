const std = @import("std");
const httpz = @import("httpz");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    const allocator = gpa.allocator();

    // More advance cases will use a custom "Handler" instead of "void".
    // The last parameter is our handler instance, since we have a "void"
    // handler, we passed a void ({}) value.
    var server = try httpz.Server(void).init(allocator, .{ .port = 3001 }, {});
    defer {
        // clean shutdown, finishes serving any live request
        server.stop();
        server.deinit();
    }

    var router = try server.router(.{});
    router.post("/push", push, .{});
    router.post("/pull", pull, .{});

    // blocks
    try server.listen();
}

fn parseJsonRequest(req: *httpz.Request, res: *httpz.Response) !?std.json.ObjectMap {
    const json_obj = req.jsonObject() catch |err| {
        std.debug.print("JSON parsing error: {}\n", .{err});
        res.status = 400;
        try res.json(.{ .message = "Invalid JSON" }, .{});
        return null;
    };

    if (json_obj == null) {
        std.debug.print("No JSON object in request body\n", .{});
        res.status = 400;
        try res.json(.{ .message = "No JSON object found" }, .{});
        return null;
    }

    return json_obj;
}

fn push(req: *httpz.Request, res: *httpz.Response) !void {
    if (try parseJsonRequest(req, res)) |obj| {
        var iterator = obj.iterator();
        while (iterator.next()) |entry| {
            std.debug.print("Key: {s}, Value: {any}\n", .{ entry.key_ptr.*, entry.value_ptr.* });
        }
        res.status = 200;
        try res.json(.{ .message = "Data received successfully" }, .{});
    }
}

fn pull(req: *httpz.Request, res: *httpz.Response) !void {
    if (try parseJsonRequest(req, res)) |obj| {
        std.log.info("PULL received JSON with {} keys", .{obj.count()});
        res.status = 200;
        try res.json(.{ .message = "Pull request processed successfully" }, .{});
    }
}
