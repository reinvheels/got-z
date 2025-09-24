const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    // Add httpz dependency
    const httpz = b.dependency("httpz", .{
        .target = target,
        .optimize = optimize,
    });

    // Create a shared library that can be used from Node.js/Bun
    const lib = b.addSharedLibrary(.{
        .name = "got-z-db-runtime",
        .root_source_file = .{ .path = "src/main.zig" },
        .target = target,
        .optimize = optimize,
    });

    // Add httpz module to library
    lib.addModule("httpz", httpz.module("httpz"));

    // Export C ABI functions
    lib.linkLibC();

    b.installArtifact(lib);

    // Create a simple test executable
    const exe = b.addExecutable(.{
        .name = "got-z-db-runtime",
        .root_source_file = .{ .path = "src/main.zig" },
        .target = target,
        .optimize = optimize,
    });

    // Add httpz module to executable
    exe.addModule("httpz", httpz.module("httpz"));

    b.installArtifact(exe);

    // Run tests
    const run_cmd = b.addRunArtifact(exe);
    run_cmd.step.dependOn(b.getInstallStep());

    if (b.args) |args| {
        run_cmd.addArgs(args);
    }

    const run_step = b.step("run", "Run the app");
    run_step.dependOn(&run_cmd.step);

    // Unit tests
    const unit_tests = b.addTest(.{
        .root_source_file = .{ .path = "src/main.zig" },
        .target = target,
        .optimize = optimize,
    });

    const run_unit_tests = b.addRunArtifact(unit_tests);
    const test_step = b.step("test", "Run unit tests");
    test_step.dependOn(&run_unit_tests.step);
}
