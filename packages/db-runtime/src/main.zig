const std = @import("std");
const Io = std.Io;
const net = Io.net;
const graph_store = @import("graph_store.zig");
const Server = @import("server.zig");

const port: u16 = 3001;

pub fn main(init: std.process.Init) !void {
    const allocator = init.gpa;
    const io = init.io;

    var graph = graph_store.GraphStore.init(allocator, io);
    defer graph.deinit();

    var server = Server.init(allocator, io, &graph);

    const address = net.IpAddress.parseIp4("0.0.0.0", port) catch unreachable;
    var tcp = try address.listen(io, .{ .reuse_address = true });
    defer tcp.deinit(io);

    std.log.info("db-runtime listening on :{d}", .{port});

    while (true) {
        const stream = tcp.accept(io) catch |err| {
            std.log.err("accept failed: {s}", .{@errorName(err)});
            continue;
        };
        _ = std.Thread.spawn(.{ .allocator = allocator }, Server.handleConnection, .{ &server, stream }) catch |err| {
            std.log.err("failed to spawn thread: {s}", .{@errorName(err)});
            stream.close(io);
            continue;
        };
    }
}
