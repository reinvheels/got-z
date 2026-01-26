const std = @import("std");

/// A dynamic array that maintains a fixed maximum size at compile time but
/// reallocates on each mutation. Elements are accessed via their logical index
/// (0..max_size-1), and internally mapped to physical indices using a bitmap
/// and popcount.
pub fn DynamicArray(comptime T: type, comptime max_size: usize) type {
    const BitmapInt = std.meta.Int(.unsigned, max_size);

    return struct {
        const Self = @This();

        allocator: std.mem.Allocator,
        /// Bitmap where bit i indicates if logical index i is present
        bitmap: BitmapInt,
        /// Physical storage array, length equals popcount(bitmap)
        data: []T,

        pub fn init(allocator: std.mem.Allocator) Self {
            return .{
                .allocator = allocator,
                .bitmap = 0,
                .data = &[_]T{},
            };
        }

        pub fn deinit(self: *Self) void {
            self.allocator.free(self.data);
            self.data = &[_]T{};
            self.bitmap = 0;
        }

        /// Check if a logical index is present
        pub fn has(self: Self, logical_index: usize) bool {
            if (logical_index >= max_size) return false;
            return (self.bitmap & (@as(BitmapInt, 1) << @intCast(logical_index))) != 0;
        }

        /// Convert logical index to physical index using popcount
        fn logicalToPhysical(self: Self, logical_index: usize) ?usize {
            if (!self.has(logical_index)) return null;

            // Count set bits before this position
            const mask = (@as(BitmapInt, 1) << @intCast(logical_index)) - 1;
            const masked = self.bitmap & mask;
            return @popCount(masked);
        }

        /// Get element at logical index
        pub fn get(self: Self, logical_index: usize) ?T {
            const physical = self.logicalToPhysical(logical_index) orelse return null;
            return self.data[physical];
        }

        /// Set element at logical index, reallocating the array
        pub fn set(self: *Self, logical_index: usize, value: T) !void {
            if (logical_index >= max_size) return error.IndexOutOfBounds;

            // const was_present = self.has(logical_index);
            const new_bitmap = self.bitmap | (@as(BitmapInt, 1) << @intCast(logical_index));
            const new_len = @popCount(new_bitmap);

            // Allocate new array
            const new_data = try self.allocator.alloc(T, new_len);
            errdefer self.allocator.free(new_data);

            // Copy elements to new array
            var new_idx: usize = 0;
            var i: usize = 0;
            while (i < max_size) : (i += 1) {
                const bit = @as(BitmapInt, 1) << @intCast(i);
                if ((new_bitmap & bit) != 0) {
                    if (i == logical_index) {
                        new_data[new_idx] = value;
                    } else if ((self.bitmap & bit) != 0) {
                        // Copy from old array
                        const old_physical = self.logicalToPhysical(i).?;
                        new_data[new_idx] = self.data[old_physical];
                    }
                    new_idx += 1;
                }
            }

            // Replace old array
            self.allocator.free(self.data);
            self.data = new_data;
            self.bitmap = new_bitmap;
        }

        /// Remove element at logical index, reallocating the array
        pub fn remove(self: *Self, logical_index: usize) !void {
            if (!self.has(logical_index)) return error.IndexNotPresent;

            const new_bitmap = self.bitmap & ~(@as(BitmapInt, 1) << @intCast(logical_index));
            const new_len = @popCount(new_bitmap);

            if (new_len == 0) {
                self.allocator.free(self.data);
                self.data = &[_]T{};
                self.bitmap = 0;
                return;
            }

            // Allocate new array
            const new_data = try self.allocator.alloc(T, new_len);
            errdefer self.allocator.free(new_data);

            // Copy elements except the removed one
            var new_idx: usize = 0;
            var i: usize = 0;
            while (i < max_size) : (i += 1) {
                if (i == logical_index) continue;

                const bit = @as(BitmapInt, 1) << @intCast(i);
                if ((self.bitmap & bit) != 0) {
                    const old_physical = self.logicalToPhysical(i).?;
                    new_data[new_idx] = self.data[old_physical];
                    new_idx += 1;
                }
            }

            // Replace old array
            self.allocator.free(self.data);
            self.data = new_data;
            self.bitmap = new_bitmap;
        }

        /// Get the number of elements currently stored
        pub fn len(self: Self) usize {
            return @popCount(self.bitmap);
        }

        /// Iterator over logical indices and their values
        pub const Iterator = struct {
            array: *const Self,
            current_logical: usize,

            pub const Entry = struct {
                logical_index: usize,
                value: T,
            };

            pub fn next(it: *Iterator) ?Entry {
                while (it.current_logical < max_size) {
                    const idx = it.current_logical;
                    it.current_logical += 1;

                    if (it.array.has(idx)) {
                        return .{
                            .logical_index = idx,
                            .value = it.array.get(idx).?,
                        };
                    }
                }
                return null;
            }
        };

        pub fn iterator(self: *const Self) Iterator {
            return .{
                .array = self,
                .current_logical = 0,
            };
        }
    };
}

test "DynamicArray basic operations" {
    const testing = std.testing;
    const allocator = testing.allocator;

    var arr = DynamicArray(i32, 8).init(allocator);
    defer arr.deinit();

    try testing.expectEqual(@as(usize, 0), arr.len());

    // Set some values
    try arr.set(0, 10);
    try arr.set(3, 30);
    try arr.set(7, 70);

    try testing.expectEqual(@as(usize, 3), arr.len());
    try testing.expectEqual(@as(i32, 10), arr.get(0).?);
    try testing.expectEqual(@as(i32, 30), arr.get(3).?);
    try testing.expectEqual(@as(i32, 70), arr.get(7).?);
    try testing.expect(arr.get(1) == null);

    // Remove an element
    try arr.remove(3);
    try testing.expectEqual(@as(usize, 2), arr.len());
    try testing.expect(arr.get(3) == null);
    try testing.expectEqual(@as(i32, 10), arr.get(0).?);
    try testing.expectEqual(@as(i32, 70), arr.get(7).?);
}

test "DynamicArray iterator" {
    const testing = std.testing;
    const allocator = testing.allocator;

    var arr = DynamicArray(i32, 16).init(allocator);
    defer arr.deinit();

    try arr.set(2, 20);
    try arr.set(5, 50);
    try arr.set(10, 100);

    var it = arr.iterator();
    var count: usize = 0;

    while (it.next()) |entry| {
        count += 1;
        switch (entry.logical_index) {
            2 => try testing.expectEqual(@as(i32, 20), entry.value),
            5 => try testing.expectEqual(@as(i32, 50), entry.value),
            10 => try testing.expectEqual(@as(i32, 100), entry.value),
            else => unreachable,
        }
    }

    try testing.expectEqual(@as(usize, 3), count);
}

test "DynamicArray popcount mapping" {
    const testing = std.testing;
    const allocator = testing.allocator;

    var arr = DynamicArray(u8, 32).init(allocator);
    defer arr.deinit();

    // Set sparse indices
    try arr.set(1, 'a');
    try arr.set(5, 'b');
    try arr.set(8, 'c');
    try arr.set(20, 'd');

    // Physical array should have 4 elements
    try testing.expectEqual(@as(usize, 4), arr.len());

    // Verify physical mapping via popcount
    try testing.expectEqual(@as(usize, 0), arr.logicalToPhysical(1).?);
    try testing.expectEqual(@as(usize, 1), arr.logicalToPhysical(5).?);
    try testing.expectEqual(@as(usize, 2), arr.logicalToPhysical(8).?);
    try testing.expectEqual(@as(usize, 3), arr.logicalToPhysical(20).?);
}
