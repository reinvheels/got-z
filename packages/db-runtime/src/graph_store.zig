const std = @import("std");
const util = @import("util/util.zig");
const dynamic = @import("util/dynamic.zig");

pub const GraphStore = struct {
    nodes: dynamic.Dynamic(2, std.json.Value),
    edges: dynamic.Dynamic(4, std.json.ObjectMap),
    allocator: std.mem.Allocator,
    mutex: std.Thread.Mutex,

    const Self = @This();

    pub fn init(allocator: std.mem.Allocator) Self {
        return Self{
            .nodes = dynamic.Dynamic(2, std.json.Value).init(allocator),
            .edges = dynamic.Dynamic(4, std.json.ObjectMap).init(allocator),
            .allocator = allocator,
            .mutex = .{},
        };
    }

    pub fn deinit(self: *Self) void {
        self.mutex.lock();
        defer self.mutex.unlock();

        var node_iterator = self.nodes.iterator();
        while (node_iterator.next()) |entry| {
            self.allocator.free(entry.key_ptr.*);
        }
        var edge_iterator = self.edges.iterator();
        while (edge_iterator.next()) |entry| {
            self.allocator.free(entry.key_ptr.*);
        }
        self.edges.deinit();
        self.nodes.deinit();
    }

    pub fn upsertNode(self: *Self, id: []const u8, body: std.json.ObjectMap) !void {
        self.mutex.lock();
        defer self.mutex.unlock();

        var iterator = body.iterator();
        while (iterator.next()) |entry| {
            self.nodes.write(.{ id, entry.key_ptr.* }, entry.value_ptr.*) catch |err| {
                std.debug.print("Error adding property {s} to node {s}: {any}\n", .{ entry.key_ptr.*, id, err });
                return err;
            };
        }
    }

    pub fn addEdge(self: *Self, from_id: []const u8, edge_type: []const u8, to_id: []const u8, body: std.json.ObjectMap) !void {
        self.mutex.lock();
        defer self.mutex.unlock();

        const from_edges = self.edges.get(from_id) orelse std.HashMap([]const u8, std.HashMap([]const u8, std.HashMap([]const u8, std.json.ObjectMap, util.StringContext, std.hash_map.default_max_load_percentage), util.StringContext, std.hash_map.default_max_load_percentage), util.StringContext, std.hash_map.default_max_load_percentage).init(self.allocator);
        const edge_type_edges = from_edges.get(edge_type) orelse std.HashMap([]const u8, std.HashMap([]const u8, std.json.ObjectMap, util.StringContext, std.hash_map.default_max_load_percentage), util.StringContext, std.hash_map.default_max_load_percentage).init(self.allocator);
        const to_edges = edge_type_edges.get(to_id) orelse std.HashMap([]const u8, std.json.ObjectMap, util.StringContext, std.hash_map.default_max_load_percentage).init(self.allocator);

        try to_edges.put(to_id, body);
        try edge_type_edges.put(edge_type, to_edges);
        try from_edges.put(from_id, edge_type_edges);
        try self.edges.put(from_id, from_edges);
    }

    pub fn query(self: *Self, node_id: []const u8, query_map: std.json.ObjectMap, allocator: std.mem.Allocator) !std.json.ObjectMap {
        self.mutex.lock();
        defer self.mutex.unlock();

        var result = std.json.ObjectMap.init(allocator);

        var prop_iterator = query_map.iterator();

        const node_body = self.nodes.get(node_id) orelse
            return error.NodeNotFound;

        while (prop_iterator.next()) |prop_entry| {
            const prop_name = prop_entry.key_ptr.*;

            switch (prop_entry.value_ptr.*) {
                .bool => |should_include| {
                    if (!should_include) continue;
                    const prop_value = node_body.get(prop_name) orelse continue;
                    try result.put(prop_name, prop_value);
                },
                else => {
                    std.debug.print("Property query for {s} is not a bool, skipping\n", .{prop_name});
                },
            }
        }

        return result;
    }
};
