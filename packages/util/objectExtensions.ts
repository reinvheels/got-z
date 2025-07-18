// TypeScript declarations for monkey-patched methods
import "./types";

// Monkey-patch Object prototype with read method using defineProperty
Object.defineProperty(Object.prototype, "read", {
  value: function (path: (string | number)[]): any {
    let current: any = this;

    for (const key of path) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[key];
    }

    return current;
  },
  writable: true,
  configurable: true,
  enumerable: false,
});

// Monkey-patch Object prototype with write method using defineProperty
Object.defineProperty(Object.prototype, "write", {
  value: function (path: (string | number)[], value: any): void {
    let current: any = this;

    // Navigate to the parent of the target property
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      const nextKey = path[i + 1];

      if (
        current[key] === null ||
        current[key] === undefined ||
        typeof current[key] !== "object"
      ) {
        // Create array if next key is numeric, otherwise create object
        current[key] = typeof nextKey === "number" ? [] : {};
      }
      current = current[key];
    }

    // Set the final value
    if (path.length > 0) {
      current[path[path.length - 1]] = value;
    }
  },
  writable: true,
  configurable: true,
  enumerable: false,
});