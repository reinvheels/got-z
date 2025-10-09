const std = @import("std");
const util = @import("util.zig");

pub fn Json(comptime depth: u32) type {
    return struct {
        const Self = @This();

        // Embed the actual HashMap directly
        map: std.json.ObjectMap,
        allocator: std.mem.Allocator,

        pub fn init(allocator: std.mem.Allocator) Self {
            return Self{
                .map = std.json.ObjectMap.init(allocator),
                .allocator = allocator,
            };
        }

        pub fn deinit(self: *Self) void {
            self.map.deinit();
        }

        pub fn get(self: *Self, key: []const u8) ?ValueType() {
            return self.map.get(key);
            // }
        }

        pub fn getPtr(self: *Self, key: []const u8) ?*ValueType() {
            return self.map.getPtr(key);
        }

        pub fn put(self: *Self, key: []const u8, value: ValueType()) !void {
            try self.map.put(key, value);
        }

        pub fn iterator(self: *Self) std.json.ObjectMap.Iterator {
            return self.map.iterator();
        }

        pub fn write(self: *Self, path: anytype, value: LeafType(@TypeOf(path))) !void {
            if (depth == 0) {
                @compileError("Cannot write path to depth 0 Json");
            }

            const path_info = @typeInfo(@TypeOf(path));
            if (path_info != .@"struct" or !path_info.@"struct".is_tuple) {
                @compileError("Path must be a tuple of strings");
            }
            const path_len = path_info.@"struct".fields.len;
            if (path_len == 0) {
                @compileError("Path cannot be empty");
            }
            if (path_len > depth) {
                @compileError("Path length must not exceed map depth");
            }

            var current_map = &self.map;
            inline for (path, 0..) |key, i| {
                if (i == path.len - 1) {
                    if (@TypeOf(value) == std.json.ObjectMap) {
                        try current_map.*.put(key, std.json.Value{ .object = value });
                    } else {
                        try current_map.*.put(key, value);
                    }
                } else {
                    var entry = current_map.*.getPtr(key);
                    if (entry == null) {
                        const new_map = std.json.ObjectMap.init(self.allocator);
                        try current_map.*.put(key, std.json.Value{ .object = new_map });
                        entry = current_map.*.getPtr(key);
                    }
                    if (entry) |e| {
                        if (e.* == .object) {
                            current_map = &e.object;
                        }
                    }
                }
            }
        }

        pub fn read(self: *Self, path: anytype) ?LeafType(@TypeOf(path)) {
            const path_info = @typeInfo(@TypeOf(path));
            if (path_info != .@"struct" or !path_info.@"struct".is_tuple) {
                @compileError("Path must be a tuple of strings");
            }
            const path_len = path_info.@"struct".fields.len;
            if (path_len == 0) {
                @compileError("Path cannot be empty");
            }
            if (path_len > depth) {
                @compileError("Path length must not exceed map depth");
            }

            // var path_array: [path_len][]const u8 = undefined;
            var current_map = &self.map;
            // inline for (path, 0..) |segment, i| {
            //     path_array[i] = segment;
            // }

            inline for (path, 0..) |key, i| {
                std.debug.print("Reading path: {s}\n", .{key});
                var entry = current_map.getPtr(key) orelse {
                    return null;
                };

                if (i == path.len - 1) {
                    // @compileLog(.{ depth, i, path.len });
                    return switch (entry.*) {
                        .object => |obj| obj,
                        else => null,
                    };
                } else {
                    if (entry.* == .object) {
                        current_map = &entry.object;
                    }
                }
            }
            return null;
        }

        fn LeafType(comptime PathType: type) type {
            const field_count = @typeInfo(PathType).@"struct".fields.len;
            // @compileLog(.{ depth, field_count });
            if (depth == field_count) {
                return std.json.Value;
            } else {
                return std.json.ObjectMap;
            }
        }

        fn ValueType() type {
            if (depth == 0) {
                return std.json.Value;
            } else {
                return std.json.ObjectMap;
            }
        }
    };
}
