const std = @import("std");
const graph_store = @import("graph_store.zig");

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
