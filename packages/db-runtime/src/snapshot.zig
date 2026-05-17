const std = @import("std");

pub const SnapshotSink = struct {
    ptr: *anyopaque,
    vtable: *const VTable,

    pub const VTable = struct {
        begin: *const fn (ptr: *anyopaque) anyerror!void,
        writeNode: *const fn (ptr: *anyopaque, id: []const u8, properties: std.json.ObjectMap) anyerror!void,
        writeEdge: *const fn (
            ptr: *anyopaque,
            from_id: []const u8,
            edge_type: []const u8,
            to_id: []const u8,
            properties: std.json.ObjectMap,
        ) anyerror!void,
        finish: *const fn (ptr: *anyopaque) anyerror!void,
    };

    pub fn begin(self: SnapshotSink) !void {
        try self.vtable.begin(self.ptr);
    }

    pub fn writeNode(self: SnapshotSink, id: []const u8, properties: std.json.ObjectMap) !void {
        try self.vtable.writeNode(self.ptr, id, properties);
    }

    pub fn writeEdge(
        self: SnapshotSink,
        from_id: []const u8,
        edge_type: []const u8,
        to_id: []const u8,
        properties: std.json.ObjectMap,
    ) !void {
        try self.vtable.writeEdge(self.ptr, from_id, edge_type, to_id, properties);
    }

    pub fn finish(self: SnapshotSink) !void {
        try self.vtable.finish(self.ptr);
    }
};
