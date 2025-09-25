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

fn push(req: *httpz.Request, res: *httpz.Response) !void {
    std.log.info("PUSH: {?s}", .{req.body()});

    res.status = 500;
    try res.json(.{ .name = "Teg" }, .{});
}

fn pull(req: *httpz.Request, res: *httpz.Response) !void {
    std.log.info("PULL: {?s}", .{req.body()});

    res.status = 200;
    try res.json(.{ .name = "Teg" }, .{});
}
