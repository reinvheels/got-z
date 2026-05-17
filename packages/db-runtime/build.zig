const std = @import("std");
const builtin = @import("builtin");

const min_zig_version = "0.17.0-dev.251+0db721ec2";

pub fn build(b: *std.Build) void {
    const required = std.SemanticVersion.parse(min_zig_version) catch unreachable;
    if (builtin.zig_version.order(required) == .lt) {
        std.debug.print(
            "db-runtime requires Zig >= {s}; current Zig is {s}\n",
            .{ min_zig_version, builtin.zig_version_string },
        );
        std.process.exit(1);
    }

    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    const exe = b.addExecutable(.{
        .name = "db-runtime",
        .root_module = b.createModule(.{
            .root_source_file = b.path("src/main.zig"),
            .target = target,
            .optimize = optimize,
        }),
    });

    b.installArtifact(exe);

    const run_cmd = b.addRunArtifact(exe);
    run_cmd.step.dependOn(b.getInstallStep());

    if (b.args) |args| {
        run_cmd.addArgs(args);
    }

    const run_step = b.step("run", "Run the app");
    run_step.dependOn(&run_cmd.step);
}
