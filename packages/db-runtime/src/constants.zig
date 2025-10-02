// Rights constants
pub const Rights = struct {
    pub const READ: []const u8 = "r";
    pub const WRITE: []const u8 = "w";
    pub const ADMIN: []const u8 = "a";
    pub const BE: []const u8 = "b";
};

// Edge direction constants
pub const EdgeDirection = struct {
    pub const OUT: []const u8 = ">";
    pub const IN: []const u8 = "<";
    pub const BI: []const u8 = "<>";
};

// Special prefixes
pub const Prefixes = struct {
    pub const RIGHTS: []const u8 = "@";
    pub const EDGE_PROPERTY: []const u8 = "-";
};