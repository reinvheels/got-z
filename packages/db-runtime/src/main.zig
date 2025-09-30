const std = @import("std");
const httpz = @import("httpz");

const Node = struct {
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

const StringContext = struct {
    pub fn hash(self: @This(), s: []const u8) u64 {
        _ = self;
        return std.hash_map.hashString(s);
    }

    pub fn eql(self: @This(), a: []const u8, b: []const u8) bool {
        _ = self;
        return std.mem.eql(u8, a, b);
    }
};

const GraphStore = struct {
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

        if (self.nodes.get(node_id)) |node| {
            while (prop_iterator.next()) |prop_entry| {
                const prop_name = prop_entry.key_ptr.*;

                switch (prop_entry.value_ptr.*) {
                    .bool => |should_include| {
                        if (should_include) {
                            if (node.body.get(prop_name)) |prop_value| {
                                try result.put(prop_name, prop_value);
                            }
                        }
                    },
                    else => {
                        std.debug.print("Property query for {s} is not a bool, skipping\n", .{prop_name});
                    },
                }
            }
        }

        return result;
    }
};

var graph_store: GraphStore = undefined;

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    const allocator = gpa.allocator();

    graph_store = GraphStore.init(allocator);

    // More advance cases will use a custom "Handler" instead of "void".
    // The last parameter is our handler instance, since we have a "void"
    // handler, we passed a void ({}) value.
    var server = try httpz.Server(void).init(allocator, .{ .port = 3001 }, {});
    defer {
        // clean shutdown, finishes serving any live request
        server.stop();
        server.deinit();
        graph_store.deinit();
    }

    var router = try server.router(.{});
    router.post("/push", push, .{});
    router.post("/pull", pull, .{});

    // blocks
    try server.listen();
}

fn parseJsonRequest(req: *httpz.Request, res: *httpz.Response) !?std.json.ObjectMap {
    const json_obj = req.jsonObject() catch |err| {
        std.debug.print("JSON parsing error: {}\n", .{err});
        res.status = 400;
        try res.json(.{ .message = "Invalid JSON" }, .{});
        return null;
    };

    if (json_obj == null) {
        std.debug.print("No JSON object in request body\n", .{});
        res.status = 400;
        try res.json(.{ .message = "No JSON object found" }, .{});
        return null;
    }

    return json_obj;
}

fn push(req: *httpz.Request, res: *httpz.Response) !void {
    if (try parseJsonRequest(req, res)) |obj| {
        var iterator = obj.iterator();
        while (iterator.next()) |entry| {
            std.debug.print("Key: {s}, Value: {any}\n", .{ entry.key_ptr.*, entry.value_ptr.* });
            switch (entry.value_ptr.*) {
                .object => |node_body| {
                    try graph_store.addNode(entry.key_ptr.*, node_body) catch |err| {
                        std.debug.print("Error adding node {s}: {any}\n", .{ entry.key_ptr.*, err });
                        continue;
                    };
                },
                else => {
                    std.debug.print("Value for key {s} is not an object, skipping\n", .{entry.key_ptr.*});
                },
            }
        }
        res.status = 200;
        try res.json(.{ .message = "Data received successfully" }, .{});
    }
}

fn pull(req: *httpz.Request, res: *httpz.Response) !void {
    if (try parseJsonRequest(req, res)) |obj| {
        std.log.info("PULL received JSON with {} keys", .{obj.count()});

        var result = std.json.ObjectMap.init(req.arena);
        var query_iterator = obj.iterator();
        while (query_iterator.next()) |query_entry| {
            const node_id = query_entry.key_ptr.*;

            switch (query_entry.value_ptr.*) {
                .object => |query_props| {
                    const node_result = graph_store.query(node_id, query_props, req.arena) catch |err| {
                        std.debug.print("Query error for node {s}: {any}\n", .{ node_id, err });
                        continue;
                    };
                    try result.put(node_id, std.json.Value{ .object = node_result });
                },
                else => {
                    std.debug.print("Query for node {s} is not an object, skipping\n", .{node_id});
                },
            }
        }

        const json_value = std.json.Value{ .object = result };
        res.status = 200;
        try res.json(json_value, .{});
    }
}
