const std = @import("std");

pub const Node = struct {
    id: []const u8,
    body: std.json.ObjectMap,

    const Self = @This();

    pub fn init(id: []const u8, body: std.json.ObjectMap) Self {
        return Self{
            .id = id,
            .body = body,
        };
    }
};

pub const StringContext = struct {
    pub fn hash(self: @This(), s: []const u8) u64 {
        _ = self;
        return std.hash_map.hashString(s);
    }

    pub fn eql(self: @This(), a: []const u8, b: []const u8) bool {
        _ = self;
        return std.mem.eql(u8, a, b);
    }
};

pub const GraphStore = struct {
    nodes: std.HashMap([]const u8, Node, StringContext, std.hash_map.default_max_load_percentage),
    allocator: std.mem.Allocator,
    mutex: std.Thread.Mutex,

    const Self = @This();

    pub fn init(allocator: std.mem.Allocator) Self {
        return Self{
            .nodes = std.HashMap([]const u8, Node, StringContext, std.hash_map.default_max_load_percentage).init(allocator),
            .allocator = allocator,
            .mutex = .{},
        };
    }

    pub fn deinit(self: *Self) void {
        self.mutex.lock();
        defer self.mutex.unlock();

        var iterator = self.nodes.iterator();
        while (iterator.next()) |entry| {
            self.allocator.free(entry.key_ptr.*);
        }
        self.nodes.deinit();
    }

    pub fn addNode(self: *Self, id: []const u8, body: std.json.ObjectMap) !void {
        self.mutex.lock();
        defer self.mutex.unlock();

        const owned_id = try self.allocator.dupe(u8, id);
        const node = Node.init(owned_id, body);
        try self.nodes.put(owned_id, node);
    }

    pub fn query(self: *Self, node_id: []const u8, query_map: std.json.ObjectMap, allocator: std.mem.Allocator) !std.json.ObjectMap {
        self.mutex.lock();
        defer self.mutex.unlock();

        var result = std.json.ObjectMap.init(allocator);

        var prop_iterator = query_map.iterator();

        const node = self.nodes.get(node_id) orelse
            return error.NodeNotFound;

        while (prop_iterator.next()) |prop_entry| {
            const prop_name = prop_entry.key_ptr.*;

            switch (prop_entry.value_ptr.*) {
                .bool => |should_include| {
                    if (!should_include) continue;
                    const prop_value = node.body.get(prop_name) orelse continue;
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