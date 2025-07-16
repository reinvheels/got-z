import { z } from 'zod';

// Node schema
export const NodeSchema = z.record(z.string(), z.any());

// Push request schema
export const PushRequestSchema = z.record(z.string(), NodeSchema);

// Push response schema
export const PushResponseSchema = z.object({
  status: z.number(),
  name: z.string(),
  message: z.string(),
});

// Pull request schema - supports nested property queries, edges, rights, and actor nodes
export const PullRequestSchema = z.record(z.string(), z.any());

// Pull response schema
export const PullResponseSchema = z.record(z.string(), NodeSchema);

// API types
export type Node = z.infer<typeof NodeSchema>;
export type PushRequest = z.infer<typeof PushRequestSchema>;
export type PushResponse = z.infer<typeof PushResponseSchema>;
export type PullRequest = z.infer<typeof PullRequestSchema>;
export type PullResponse = z.infer<typeof PullResponseSchema>;

// Rights constants
export const Rights = {
  READ: 'r',
  WRITE: 'w',
  ADMIN: 'a',
  BE: 'b',
} as const;

// Edge direction constants
export const EdgeDirection = {
  OUT: '>',
  IN: '<',
  BI: '<>',
} as const;

// Special prefixes
export const Prefixes = {
  RIGHTS: '@',
  EDGE_PROPERTY: '-',
} as const;