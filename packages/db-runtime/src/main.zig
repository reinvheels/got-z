const std = @import("std");
const httpz = @import("httpz");

const MessageType = enum {
    push,
    pull,
};

const Message = struct {
    type: MessageType,
    data: std.json.ObjectMap,
    timestamp: i64,
};

const MessageQueue = struct {
    messages: std.ArrayList(Message),
    mutex: std.Thread.Mutex,
    allocator: std.mem.Allocator,

    const Self = @This();

    pub fn init(allocator: std.mem.Allocator) Self {
        const self = Self{
            .messages = std.ArrayList(Message){},
            .mutex = .{},
            .allocator = allocator,
        };
        return self;
    }

    pub fn deinit(self: *Self) void {
        self.messages.deinit(self.allocator);
    }

    pub fn enqueue(self: *Self, message: Message) !void {
        self.mutex.lock();
        defer self.mutex.unlock();
        try self.messages.append(self.allocator, message);
    }

    pub fn dequeue(self: *Self) ?Message {
        self.mutex.lock();
        defer self.mutex.unlock();
        if (self.messages.items.len == 0) return null;
        return self.messages.orderedRemove(0);
    }

    pub fn isEmpty(self: *Self) bool {
        self.mutex.lock();
        defer self.mutex.unlock();
        return self.messages.items.len == 0;
    }
};

var global_queue: MessageQueue = undefined;

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    const allocator = gpa.allocator();

    // Initialize global message queue
    global_queue = MessageQueue.init(allocator);
    defer global_queue.deinit();

    // More advance cases will use a custom "Handler" instead of "void".
    // The last parameter is our handler instance, since we have a "void"
    // handler, we passed a void ({}) value.
    var server = try httpz.Server(void).init(allocator, .{ .port = 3001 }, {});
    defer {
        // clean shutdown, finishes serving any live request
        server.stop();
        server.deinit();
    }

    var router = try server.router(.{});
    router.post("/push", push, .{});
    router.post("/pull", pull, .{});

    // Start message processing thread
    const thread = try std.Thread.spawn(.{}, processMessages, .{});
    defer thread.join();

    std.debug.print("Server started on port 3001\n", .{});
    std.debug.print("Message processor thread started\n", .{});

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
        const message = Message{
            .type = MessageType.push,
            .data = obj,
            .timestamp = std.time.timestamp(),
        };

        try global_queue.enqueue(message);
        std.debug.print("PUSH message enqueued at timestamp: {}\n", .{message.timestamp});

        res.status = 200;
        try res.json(.{ .message = "Push request enqueued successfully" }, .{});
    }
}

fn pull(req: *httpz.Request, res: *httpz.Response) !void {
    if (try parseJsonRequest(req, res)) |obj| {
        const message = Message{
            .type = MessageType.pull,
            .data = obj,
            .timestamp = std.time.timestamp(),
        };

        try global_queue.enqueue(message);
        std.debug.print("PULL message enqueued at timestamp: {}\n", .{message.timestamp});

        res.status = 200;
        try res.json(.{ .message = "Pull request enqueued successfully" }, .{});
    }
}

fn processMessages() void {
    while (true) {
        // std.debug.print("listening\n", .{});
        if (global_queue.dequeue()) |message| {
            std.debug.print("Processing {} message from timestamp: {}\n", .{ message.type, message.timestamp });

            switch (message.type) {
                MessageType.push => {
                    std.debug.print("Processing PUSH data with {} keys\n", .{message.data.count()});
                    var iterator = message.data.iterator();
                    while (iterator.next()) |entry| {
                        std.debug.print("  Key: {s}, Value: {any}\n", .{ entry.key_ptr.*, entry.value_ptr.* });
                    }
                },
                MessageType.pull => {
                    std.debug.print("Processing PULL data with {} keys\n", .{message.data.count()});
                },
            }
        } else {
            std.Thread.sleep(100 * std.time.ns_per_ms);
        }
    }
}
