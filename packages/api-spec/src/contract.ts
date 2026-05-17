import { defineGotzContract } from "./define";

export const gotzApiContract = defineGotzContract({
  openapi: "3.1.0",
  info: {
    title: "Got-Z Graph API",
    version: "0.1.0",
    status: "partial",
    description:
      "OpenAPI-inspired contract for the Got-Z graph API, extended with graph-specific key grammar and semantic rules.",
  },

  paths: {
    "/push": {
      post: {
        operationId: "push",
        status: "implemented",
        summary: "Push graph mutations",
        description: "Accepts graph mutations and merges them into the current graph state.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schemaRef: "PushDocument",
            },
          },
        },
        responses: {
          "200": {
            description: "Mutation accepted by the runtime.",
            content: {
              "application/json": {
                schemaRef: "PushAck",
              },
            },
          },
          "400": {
            description: "Invalid content type, invalid JSON, or invalid request body shape.",
            content: {
              "application/json": {
                schemaRef: "ErrorResponse",
              },
            },
          },
          "405": {
            description: "Method not allowed.",
            content: {
              "application/json": {
                schemaRef: "ErrorResponse",
              },
            },
          },
        },
      },
    },
    "/pull": {
      post: {
        operationId: "pull",
        status: "implemented",
        summary: "Pull projected graph data",
        description: "Accepts a projection query and returns matching graph data.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schemaRef: "PullDocument",
            },
          },
        },
        responses: {
          "200": {
            description: "Projected graph data.",
            content: {
              "application/json": {
                schemaRef: "PullResultDocument",
              },
            },
          },
          "400": {
            description: "Invalid content type, invalid JSON, or invalid request body shape.",
            content: {
              "application/json": {
                schemaRef: "ErrorResponse",
              },
            },
          },
          "405": {
            description: "Method not allowed.",
            content: {
              "application/json": {
                schemaRef: "ErrorResponse",
              },
            },
          },
        },
      },
    },
  },

  components: {
    schemas: {
      PushDocument: {
        status: "implemented",
        type: "object",
        xGotzShape: "Record<NodeId, PushNodeBody>",
        description: "A JSON object whose top-level keys are node IDs and whose values are node mutation bodies.",
      },
      PullDocument: {
        status: "implemented",
        type: "object",
        xGotzShape: "Record<NodeId, PullNodeBody>",
        description: "A JSON object whose top-level keys are node IDs and whose values describe requested projections.",
      },
      PushAck: {
        status: "implemented",
        type: "object",
        xGotzShape: "{ message: string }",
        description: "A JSON acknowledgement returned after a mutation is accepted by the runtime.",
      },
      PullResultDocument: {
        status: "implemented",
        type: "object",
        xGotzShape: "Record<NodeId, PullResultNodeBody>",
        description: "A JSON object containing the projected graph data requested by a PullDocument.",
      },
      ErrorResponse: {
        status: "implemented",
        type: "object",
        xGotzShape: "{ error?: string, message?: string }",
        description: "Error body returned for invalid requests or unsupported methods.",
      },
    },

    examples: {
      basicNodeProperties: {
        summary: "Basic node properties",
        status: "implemented",
        description: "Writes scalar properties on two nodes and queries a subset of those properties.",
        value: {
          push: {
            "node-1": {
              name: "Ada",
              role: "researcher",
            },
            "node-2": {
              name: "Grace",
              role: "engineer",
            },
          },
          pull: {
            "node-1": {
              name: true,
            },
            "node-2": {
              role: true,
            },
          },
          result: {
            "node-1": {
              name: "Ada",
            },
            "node-2": {
              role: "engineer",
            },
          },
        },
      },
      outgoingEdgeWithProperty: {
        summary: "Outgoing edge with edge property",
        status: "implemented",
        description: "Writes an outgoing relationship and stores metadata on the edge.",
        value: {
          push: {
            "node-1": {
              ">knows": {
                "node-2": {
                  "-since": 2024,
                  name: "Grace",
                },
              },
            },
          },
          pull: {
            "node-1": {
              ">knows": {
                "-since": true,
                name: true,
              },
            },
          },
          result: {
            "node-1": {
              ">knows": {
                "node-2": {
                  "-since": 2024,
                  name: "Grace",
                },
              },
            },
          },
        },
      },
    },
  },

  xGotzTokens: {
    rights: {
      READ: "r",
      WRITE: "w",
      ADMIN: "a",
      BE: "b",
    },
    edgeDirections: {
      OUT: ">",
      IN: "<",
      BI: "<>",
    },
    prefixes: {
      RIGHTS: "@",
      EDGE_PROPERTY: "-",
    },
  },

  xGotzKeyGrammar: {
    topLevelNodeId: {
      context: "document.topLevelKey",
      status: "implemented",
      meaning: "A top-level object key identifies a node.",
    },
    nodePropertyKey: {
      context: "push.nodeBody.key",
      status: "implemented",
      meaning: "A regular key on a node body writes a node property.",
    },
    outgoingEdgeKey: {
      token: ">",
      context: "push.nodeBody.key",
      status: "implemented",
      meaning: "A key starting with > writes outgoing relationships from the current node.",
    },
    incomingEdgeKey: {
      token: "<",
      context: "push.nodeBody.key",
      status: "planned",
      meaning: "A key starting with < should write incoming relationships to the current node.",
    },
    bidirectionalEdgeKey: {
      token: "<>",
      context: "push.nodeBody.key",
      status: "planned",
      meaning: "A key starting with <> should write relationships in both directions.",
    },
    edgePropertyKey: {
      token: "-",
      context: "push.edgeTargetBody.key",
      status: "implemented",
      meaning: "A key starting with - writes a property on the edge instead of the target node.",
    },
    pullInclude: {
      context: "pull.nodeBody.value",
      status: "implemented",
      meaning: "A true value requests that the matching node or edge property be included in the result.",
    },
    actorRightsKey: {
      token: "@",
      context: "push.nodeBody.key",
      status: "planned",
      meaning: "A key starting with @ is reserved for actors and rights.",
    },
  },

  xGotzSemantics: {
    pushNodeProperty: {
      status: "implemented",
      when: "POST /push nodeBody contains a regular key",
      effect: "Set or replace that property on the current node.",
    },
    pushOutgoingEdge: {
      status: "implemented",
      when: "POST /push nodeBody contains a >relationship key",
      effect: "Upsert edges from the current node to each target node under the relationship.",
    },
    pushEdgeProperty: {
      status: "implemented",
      when: "POST /push edge target body contains a -prefixed key",
      effect: "Set or replace that property on the edge.",
    },
    pushTargetNodeProperty: {
      status: "implemented",
      when: "POST /push edge target body contains a regular key",
      effect: "Set or replace that property on the target node.",
    },
    pullTrue: {
      status: "implemented",
      when: "POST /pull query value is true",
      effect: "Include the matching property or relationship in the result.",
    },
  },

  xGotzRuntimeModes: {
    ephemeral: {
      status: "implemented",
      default: true,
      storageEngine: "NoopEngine",
      durability: "In-memory only. Restart loses state.",
    },
    persistent: {
      status: "implemented",
      flag: "-p / --persistent",
      storageEngine: "JsonWalEngine",
      durability: "Asynchronous batched WAL in the process working directory.",
    },
  },

  xGotzConformance: {
    basicNodeProperties: {
      status: "implemented",
      exampleRef: "components.examples.basicNodeProperties",
      mode: "run",
    },
    outgoingEdgeWithProperty: {
      status: "implemented",
      exampleRef: "components.examples.outgoingEdgeWithProperty",
      mode: "run",
    },
  },

  xGotzLimitations: {
    rightsAndActorsPlanned: {
      status: "planned",
      description: "Actor nodes and rights prefixes exist in early tests and constants but are not implemented by the runtime yet.",
    },
    incomingAndBidirectionalEdgesPlanned: {
      status: "planned",
      description: "Incoming and bidirectional edge prefixes are reserved but only outgoing edges are currently implemented.",
    },
    generatedDocsNotYetWired: {
      status: "planned",
      description: "Markdown, JSON contract output, and generated conformance tests are planned but not generated yet.",
    },
  },
} as const);

export type GotzApiContractSource = typeof gotzApiContract;
