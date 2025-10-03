const std = @import("std");
const util = @import("util.zig");

fn _NestedHashMap(comptime depth: u32, comptime ValueType: type) type {
    if (depth == 0) {
        return ValueType;
    } else {
        return std.HashMap([]const u8, _NestedHashMap(depth - 1, ValueType), util.StringContext, std.hash_map.default_max_load_percentage);
    }
}

pub fn Dynamic(comptime depth: u32, comptime ValueType: type) type {
    const BaseMapType = _NestedHashMap(depth, ValueType);

    return struct {
        const Self = @This();

        // Embed the actual HashMap directly
        map: BaseMapType,
        allocator: std.mem.Allocator,

        pub fn init(allocator: std.mem.Allocator) Self {
            return Self{
                .map = BaseMapType.init(allocator),
                .allocator = allocator,
            };
        }

        // Delegate all HashMap methods to the embedded map
        pub fn put(self: *Self, key: []const u8, value: anytype) !void {
            return self.map.put(key, value);
        }

        pub fn get(self: *Self, key: []const u8) ?_NestedHashMap(depth - 1, ValueType) {
            return self.map.get(key);
        }

        pub fn getPtr(self: *Self, key: []const u8) ?*_NestedHashMap(depth - 1, ValueType) {
            return self.map.getPtr(key);
        }

        pub fn iterator(self: *Self) @TypeOf(self.map).Iterator {
            return self.map.iterator();
        }

        pub fn count(self: *Self) u32 {
            return self.map.count();
        }

        pub fn deinit(self: *Self) void {
            self.map.deinit();
        }

        pub fn write(self: *Self, path: anytype, value: ValueType) !void {
            if (depth == 0) {
                @compileError("Cannot write path to depth 0 NestedHashMap");
            }

            const path_info = @typeInfo(@TypeOf(path));
            if (path_info != .@"struct" or !path_info.@"struct".is_tuple) {
                @compileError("Path must be a tuple of strings");
            }

            const path_len = path_info.@"struct".fields.len;
            if (path_len == 0) {
                @compileError("Path cannot be empty");
            }

            if (path_len != depth) {
                @compileError("Path length must match map depth");
            }

            return writeAtDepth(self, path, value, 0);
        }

        fn writeAtDepth(self: *Self, path: anytype, value: ValueType, comptime path_offset: u32) !void {
            comptime {
                if (path_offset >= path.len) {
                    @compileError("path_offset exceeds path length");
                }
            }

            const remaining_depth = path.len - path_offset;

            if (remaining_depth == 1) {
                // Base case: we're at the final level
                try self.map.put(path[path_offset], value);
            } else {
                // Recursive case: navigate deeper
                const key = path[path_offset];
                const NestedType = Dynamic(remaining_depth - 1, ValueType);

                if (self.map.getPtr(key)) |existing| {
                    var nested_dynamic = NestedType{ .map = existing.*, .allocator = self.allocator };
                    try nested_dynamic.writeAtDepth(path, value, path_offset + 1);
                    existing.* = nested_dynamic.map;
                } else {
                    var new_nested = NestedType.init(self.allocator);
                    try new_nested.writeAtDepth(path, value, path_offset + 1);
                    try self.map.put(key, new_nested.map);
                }
            }
        }

        pub fn read(self: *Self, path: anytype) ?ValueType {
            if (depth == 0) {
                @compileError("Cannot read path from depth 0 NestedHashMap");
            }

            const path_info = @typeInfo(@TypeOf(path));
            if (path_info != .@"struct" or !path_info.@"struct".is_tuple) {
                @compileError("Path must be a tuple of strings");
            }

            const path_len = path_info.@"struct".fields.len;
            if (path_len == 0) {
                @compileError("Path cannot be empty");
            }

            if (path_len != depth) {
                @compileError("Path length must match map depth");
            }

            return readAtDepth(self, path, 0);
        }

        fn readAtDepth(self: *Self, path: anytype, comptime path_offset: u32) ?ValueType {
            comptime {
                if (path_offset >= path.len) {
                    @compileError("path_offset exceeds path length");
                }
            }

            const remaining_depth = path.len - path_offset;

            if (remaining_depth == 1) {
                // Base case: we're at the final level
                return self.map.get(path[path_offset]);
            } else {
                // Recursive case: navigate deeper
                const key = path[path_offset];
                const NestedType = Dynamic(remaining_depth - 1, ValueType);

                if (self.map.get(key)) |nested| {
                    var nested_dynamic = NestedType{ .map = nested, .allocator = self.allocator };
                    return nested_dynamic.readAtDepth(path, path_offset + 1);
                }

                return null;
            }
        }
    };
}
