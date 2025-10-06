const std = @import("std");

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

pub fn mergeJsonMap(left: *std.json.ObjectMap, right: *const std.json.ObjectMap) !void {
    var right_iter = right.*.iterator();
    while (right_iter.next()) |entry| {
        try left.*.put(entry.key_ptr.*, entry.value_ptr.*);
    }
}

pub fn dumpJsonMap(message: []const u8, map: *const std.json.ObjectMap) void {
    std.debug.print("{s} DUMP\n", .{message});
    std.json.Value.dump(std.json.Value{ .object = map.* });
    std.debug.print("\n", .{});
}
