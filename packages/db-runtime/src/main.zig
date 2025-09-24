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
    router.all("/*", getUser, .{});

    // blocks
    try server.listen();
}

fn getUser(req: *httpz.Request, res: *httpz.Response) !void {
    std.log.info("Request method: {s}", .{@tagName(req.method)});
    std.log.info("Request path: {s}", .{req.url.path});

    // var it = req.headers;
    // while (it.next()) |header| {
    //     std.log.info("Header {s}: {s}", .{ header.name, header.value });
    // }

    // if (req.body()) |body| {
    //     std.log.info("Request body: {s}", .{body});
    // }

    res.status = 200;
    try res.json(.{ .name = "Teg" }, .{});
}
