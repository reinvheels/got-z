const std = @import("std");
const util = @import("util/util.zig");
const json = @import("util/json.zig");

pub const GraphStore = struct {
    nodes: json.Json(2),
    edges: json.Json(4),
    allocator: std.mem.Allocator,
    mutex: std.Thread.Mutex,

    const Self = @This();

    pub fn init(allocator: std.mem.Allocator) Self {
        return Self{
            .nodes = json.Json(2).init(allocator),
            .edges = json.Json(4).init(allocator),
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
        if (self.nodes.read(.{id}) == null) {
            self.nodes.write(.{id}, std.json.ObjectMap.init(self.allocator)) catch |err| {
                std.debug.print("Error creating node {s}: {any}\n", .{ id, err });
                return err;
            };
        }
        var iterator = body.iterator();
        while (iterator.next()) |entry| {
            if (entry.key_ptr.*[0] == '>') {
                const relationship_type = entry.key_ptr.*;
                switch (entry.value_ptr.*) {
                    .object => |targets| {
                        var target_iterator = targets.iterator();
                        while (target_iterator.next()) |target_entry| {
                            try self.upsertEdge(id, relationship_type, target_entry.key_ptr.*, target_entry.value_ptr.*);
                        }
                    },
                    else => {
                        std.debug.print("Relationship {s} value is not an object, skipping\n", .{relationship_type});
                    },
                }
            } else {
                self.nodes.write(.{ id, entry.key_ptr.* }, entry.value_ptr.*) catch |err| {
                    std.debug.print("Error adding property {s} to node {s}: {any}\n", .{ entry.key_ptr.*, id, err });
                    return err;
                };
            }
        }
    }

    pub fn upsertEdge(self: *Self, from_id: []const u8, edge_type: []const u8, to_id: []const u8, body: std.json.Value) !void {
        if (self.nodes.read(.{to_id}) == null) {
            self.nodes.write(.{to_id}, std.json.ObjectMap.init(self.allocator)) catch |err| {
                std.debug.print("Error creating target node {s}: {any}\n", .{ to_id, err });
                return err;
            };
        }

        const obj = obj: switch (body) {
            .object => |obj| obj,
            .bool => |is_edge| {
                if (is_edge) {
                    break :obj std.json.ObjectMap.init(self.allocator);
                } else {
                    return error.InvalidEdgeBody;
                }
            },
            else => {
                std.debug.print("Edge body is not an object\n", .{});
                return error.InvalidEdgeBody;
            },
        };

        if (self.edges.read(.{ from_id, edge_type, to_id }) == null) {
            self.edges.write(.{ from_id, edge_type, to_id }, std.json.ObjectMap.init(self.allocator)) catch |err| {
                std.debug.print("Error creating edge {s} -> {s} ({s}): {any}\n", .{ from_id, to_id, edge_type, err });
                return err;
            };
        }

        var iterator = obj.iterator();
        while (iterator.next()) |entry| {
            if (entry.key_ptr.*[0] == '-') {
                self.edges.write(.{ from_id, edge_type, to_id, entry.key_ptr.* }, entry.value_ptr.*) catch |err| {
                    std.debug.print("Error adding property {s} to edge {s} -> {s} ({s}): {any}\n", .{ entry.key_ptr.*, from_id, to_id, edge_type, err });
                    return err;
                };
            } else {
                self.nodes.write(.{ to_id, entry.key_ptr.* }, entry.value_ptr.*) catch |err| {
                    std.debug.print("Error adding property {s} to node {s}: {any}\n", .{ entry.key_ptr.*, to_id, err });
                    return err;
                };
            }
        }
    }

    pub fn query(self: *Self, node_id: []const u8, query_map: std.json.ObjectMap, allocator: std.mem.Allocator) !std.json.ObjectMap {
        var result = try self.queryNode(node_id, query_map, allocator);
        const edges_result = try self.queryEdges(node_id, query_map, allocator);
        try util.mergeJsonMap(&result, &edges_result);

        return result;
    }

    pub fn queryNode(self: *Self, node_id: []const u8, query_map: std.json.ObjectMap, allocator: std.mem.Allocator) !std.json.ObjectMap {
        var result = std.json.ObjectMap.init(allocator);

        var prop_iterator = query_map.iterator();

        const node_body = self.nodes.read(.{node_id}) orelse
            return error.NodeNotFound;

        while (prop_iterator.next()) |prop_entry| {
            const prop_name = prop_entry.key_ptr.*;
            if (prop_name[0] == '>') continue;

            switch (prop_entry.value_ptr.*) {
                .bool => |should_include| {
                    if (should_include) {
                        const prop_value = node_body.get(prop_name) orelse continue;
                        try result.put(prop_name, prop_value);
                    }
                },
                else => {
                    std.debug.print("Property query for {s} is not a bool, skipping\n", .{prop_name});
                },
            }
        }

        return result;
    }

    pub fn queryEdges(self: *Self, from_id: []const u8, query_map: std.json.ObjectMap, allocator: std.mem.Allocator) !std.json.ObjectMap {
        var result = std.json.ObjectMap.init(allocator);

        var edge_type_iterator = query_map.iterator();
        while (edge_type_iterator.next()) |edge_type_entry| {
            const edge_type = edge_type_entry.key_ptr.*;
            if (edge_type[0] != '>') continue;
            const edge_query = qry: switch (edge_type_entry.value_ptr.*) {
                .object => |obj| obj,
                .bool => |include| {
                    if (include) {
                        break :qry std.json.ObjectMap.init(allocator);
                    } else {
                        continue;
                    }
                },
                else => {
                    std.debug.print("Edge query for {s} is not an object, skipping\n", .{edge_type});
                    continue;
                },
            };

            const edges = self.queryEdge(from_id, edge_type, edge_query, allocator) catch |err| {
                std.debug.print("Error querying edges of type {s} from node {s}: {any}\n", .{ edge_type, from_id, err });
                continue;
            };
            try result.put(edge_type, std.json.Value{ .object = edges });
        }

        return result;
    }

    pub fn queryEdge(self: *Self, from_id: []const u8, edge_type: []const u8, query_map: std.json.ObjectMap, allocator: std.mem.Allocator) !std.json.ObjectMap {
        var result = std.json.ObjectMap.init(allocator);

        var to_edges = self.edges.read(.{ from_id, edge_type }) orelse
            return error.NoEdgesFound;

        var edges_iterator = to_edges.iterator();
        while (edges_iterator.next()) |edge_entry| {
            const to_id = edge_entry.key_ptr.*;
            const edge_obj = switch (edge_entry.value_ptr.*) {
                .object => |obj| obj,
                else => continue,
            };

            var query_edge_iterator = query_map.iterator();
            var result_edge_body = std.json.ObjectMap.init(allocator);
            while (query_edge_iterator.next()) |query_edge_entry| {
                const prop_name = query_edge_entry.key_ptr.*;
                if (prop_name[0] != '-') continue;
                switch (query_edge_entry.value_ptr.*) {
                    .bool => |should_include| {
                        if (!should_include) continue;
                        const prop_value = edge_obj.get(prop_name) orelse continue;
                        try result_edge_body.put(prop_name, prop_value);
                    },
                    else => {
                        std.debug.print("Edge property query for {s} is not a bool, skipping\n", .{prop_name});
                    },
                }
            }
            var result_node_body = try self.queryNode(to_id, query_map, allocator);
            try util.mergeJsonMap(&result_edge_body, &result_node_body);
            try result.put(to_id, std.json.Value{ .object = result_edge_body });
        }

        return result;
    }
};
