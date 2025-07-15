const std = @import("std");
const print = std.debug.print;
const ArrayList = std.ArrayList;
const HashMap = std.HashMap;
const Allocator = std.mem.Allocator;

// Basic node structure
const Node = struct {
    id: []const u8,
    properties: HashMap([]const u8, []const u8, std.hash_map.StringContext, std.hash_map.default_max_load_percentage),
    
    pub fn init(allocator: Allocator, id: []const u8) Node {
        return Node{
            .id = id,
            .properties = HashMap([]const u8, []const u8, std.hash_map.StringContext, std.hash_map.default_max_load_percentage).init(allocator),
        };
    }
    
    pub fn deinit(self: *Node) void {
        self.properties.deinit();
    }
    
    pub fn setProperty(self: *Node, key: []const u8, value: []const u8) !void {
        try self.properties.put(key, value);
    }
    
    pub fn getProperty(self: *Node, key: []const u8) ?[]const u8 {
        return self.properties.get(key);
    }
};

// Basic graph database structure
const GraphDB = struct {
    nodes: HashMap([]const u8, Node, std.hash_map.StringContext, std.hash_map.default_max_load_percentage),
    allocator: Allocator,
    
    pub fn init(allocator: Allocator) GraphDB {
        return GraphDB{
            .nodes = HashMap([]const u8, Node, std.hash_map.StringContext, std.hash_map.default_max_load_percentage).init(allocator),
            .allocator = allocator,
        };
    }
    
    pub fn deinit(self: *GraphDB) void {
        var iterator = self.nodes.iterator();
        while (iterator.next()) |entry| {
            entry.value_ptr.deinit();
        }
        self.nodes.deinit();
    }
    
    pub fn createNode(self: *GraphDB, id: []const u8) !*Node {
        var node = Node.init(self.allocator, id);
        try self.nodes.put(id, node);
        return self.nodes.getPtr(id).?;
    }
    
    pub fn getNode(self: *GraphDB, id: []const u8) ?*Node {
        return self.nodes.getPtr(id);
    }
    
    pub fn deleteNode(self: *GraphDB, id: []const u8) bool {
        if (self.nodes.fetchRemove(id)) |kv| {
            kv.value.deinit();
            return true;
        }
        return false;
    }
    
    pub fn nodeCount(self: *GraphDB) u32 {
        return @intCast(self.nodes.count());
    }
};

// C ABI exports for Node.js/Bun integration
export fn createGraphDB() *GraphDB {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    const allocator = gpa.allocator();
    const db = allocator.create(GraphDB) catch return null;
    db.* = GraphDB.init(allocator);
    return db;
}

export fn destroyGraphDB(db: *GraphDB) void {
    db.deinit();
    // Note: In a real implementation, we'd need to properly manage the allocator
}

export fn addNode(db: *GraphDB, id_ptr: [*]const u8, id_len: usize) bool {
    const id = id_ptr[0..id_len];
    _ = db.createNode(id) catch return false;
    return true;
}

export fn getNodeCount(db: *GraphDB) u32 {
    return db.nodeCount();
}

// Main function for testing
pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    print("Got-Z Database Runtime\n");
    print("Initializing graph database...\n");
    
    var db = GraphDB.init(allocator);
    defer db.deinit();
    
    // Test creating nodes
    _ = try db.createNode("node-1");
    _ = try db.createNode("node-2");
    
    print("Created {} nodes\n", .{db.nodeCount()});
    
    // Test node properties
    if (db.getNode("node-1")) |node| {
        try node.setProperty("name", "Test Node 1");
        try node.setProperty("type", "test");
        
        if (node.getProperty("name")) |name| {
            print("Node 1 name: {s}\n", .{name});
        }
    }
    
    print("Database test completed successfully!\n");
}

// Tests
test "basic node operations" {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();
    
    var db = GraphDB.init(allocator);
    defer db.deinit();
    
    // Test node creation
    _ = try db.createNode("test-node");
    try std.testing.expect(db.nodeCount() == 1);
    
    // Test node retrieval
    const node = db.getNode("test-node");
    try std.testing.expect(node != null);
    
    // Test node properties
    try node.?.setProperty("test", "value");
    const value = node.?.getProperty("test");
    try std.testing.expect(std.mem.eql(u8, value.?, "value"));
    
    // Test node deletion
    try std.testing.expect(db.deleteNode("test-node"));
    try std.testing.expect(db.nodeCount() == 0);
}