const std = @import("std");
const Io = std.Io;
const net = Io.net;
const graph_store = @import("graph_store.zig");
const Server = @import("server.zig");

const default_port: u16 = 3001;

pub fn main(init: std.process.Init) !void {
    const allocator = init.gpa;
    const io = init.io;
    const port = try resolvePort(init);

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

fn resolvePort(init: std.process.Init) !u16 {
    var port = default_port;

    if (init.environ_map.get("GOT_Z_PORT")) |value| {
        port = try parsePort(value);
    }

    var args = std.process.Args.Iterator.init(init.minimal.args);
    _ = args.skip();
    while (args.next()) |arg| {
        if (std.mem.eql(u8, arg, "--port") or std.mem.eql(u8, arg, "-p")) {
            const value = args.next() orelse return error.MissingPortValue;
            port = try parsePort(value);
        } else if (std.mem.startsWith(u8, arg, "--port=")) {
            port = try parsePort(arg["--port=".len..]);
        }
    }

    return port;
}

fn parsePort(value: []const u8) !u16 {
    const port = try std.fmt.parseInt(u16, value, 10);
    if (port == 0) return error.InvalidPort;
    return port;
}
