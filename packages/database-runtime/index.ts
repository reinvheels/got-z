import { dlopen, FFIType, suffix } from 'bun:ffi';
import { PushRequest, PullResponse } from '@got-z/api-spec';

// FFI bindings to the Zig shared library
const lib = dlopen(`./zig-out/lib/libgot-z-db.${suffix}`, {
  createGraphDB: {
    returns: FFIType.ptr,
    args: [],
  },
  destroyGraphDB: {
    returns: FFIType.void,
    args: [FFIType.ptr],
  },
  addNode: {
    returns: FFIType.bool,
    args: [FFIType.ptr, FFIType.ptr, FFIType.u64],
  },
  getNodeCount: {
    returns: FFIType.u32,
    args: [FFIType.ptr],
  },
});

export class GraphDatabase {
  private db: any;

  constructor() {
    this.db = lib.symbols.createGraphDB();
    if (!this.db) {
      throw new Error('Failed to create graph database');
    }
  }

  destroy() {
    if (this.db) {
      lib.symbols.destroyGraphDB(this.db);
      this.db = null;
    }
  }

  push(data: PushRequest): { status: number; name: string; message: string } {
    try {
      // For now, just add nodes without properties
      // In a full implementation, this would parse the JSON and create nodes/edges
      for (const [nodeId, _properties] of Object.entries(data)) {
        const nodeIdBuffer = Buffer.from(nodeId, 'utf8');
        const success = lib.symbols.addNode(this.db, nodeIdBuffer, nodeIdBuffer.length);
        if (!success) {
          return {
            status: 500,
            name: 'PushError',
            message: `Failed to add node ${nodeId}`,
          };
        }
      }

      return {
        status: 200,
        name: 'PushSuccess',
        message: 'Pushed successfully',
      };
    } catch (error) {
      return {
        status: 500,
        name: 'PushError',
        message: `Error: ${error}`,
      };
    }
  }

  pull(): PullResponse {
    // For now, return empty response
    // In a full implementation, this would serialize all nodes/edges to JSON
    return {};
  }

  getNodeCount(): number {
    return lib.symbols.getNodeCount(this.db);
  }
}

export default GraphDatabase;