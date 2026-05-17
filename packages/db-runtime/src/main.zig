const std = @import("std");
const Io = std.Io;
const net = Io.net;
const graph_store = @import("graph_store.zig");
const storage = @import("storage.zig");
const Server = @import("server.zig");

const default_port: u16 = 3001;

const RuntimeConfig = struct {
    port: u16 = default_port,
    persistent: bool = false,
};

pub fn main(init: std.process.Init) !void {
    const allocator = init.gpa;
    const io = init.io;
    const config = try resolveConfig(init);

    var graph = graph_store.GraphStore.init(allocator, io);
    defer graph.deinit();

    var noop_storage = storage.NoopEngine{};
    var wal_storage = storage.JsonWalEngine.init(allocator, io);
    const storage_engine = if (config.persistent) wal_storage.engine() else noop_storage.engine();
    defer storage_engine.deinit();

    try storage_engine.load(&graph);

    var server = Server.init(allocator, io, &graph, storage_engine);

    const address = net.IpAddress.parseIp4("0.0.0.0", config.port) catch unreachable;
    var tcp = try address.listen(io, .{ .reuse_address = true });
    defer tcp.deinit(io);

    std.log.info("db-runtime listening on :{d}", .{config.port});
    std.log.info("db-runtime persistence: {s}", .{if (config.persistent) "enabled" else "disabled"});

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

fn resolveConfig(init: std.process.Init) !RuntimeConfig {
    var config = RuntimeConfig{};

    if (init.environ_map.get("GOT_Z_PORT")) |value| {
        config.port = try parsePort(value);
    }

    var args = std.process.Args.Iterator.init(init.minimal.args);
    _ = args.skip();
    while (args.next()) |arg| {
        if (std.mem.eql(u8, arg, "--port")) {
            const value = args.next() orelse return error.MissingPortValue;
            config.port = try parsePort(value);
        } else if (std.mem.startsWith(u8, arg, "--port=")) {
            config.port = try parsePort(arg["--port=".len..]);
        } else if (std.mem.eql(u8, arg, "--persistent") or std.mem.eql(u8, arg, "-p")) {
            config.persistent = true;
        }
    }

    return config;
}

fn parsePort(value: []const u8) !u16 {
    const port = try std.fmt.parseInt(u16, value, 10);
    if (port == 0) return error.InvalidPort;
    return port;
}
