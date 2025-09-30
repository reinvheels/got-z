const httpz = @import("httpz");
const std = @import("std");

pub fn parseJsonRequest(req: *httpz.Request, res: *httpz.Response) !?std.json.ObjectMap {
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
