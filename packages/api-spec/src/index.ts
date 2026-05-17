import { z } from 'zod';
import { gotApiContract } from './contract';
export { gotApiContract };
export type {
  ContractStatus,
  ExampleSpec,
  GotApiContract,
  KeyGrammarSpec,
  OperationSpec,
  PathItemSpec,
  TokenMapSpec,
  TokenSpec,
} from './define';
export { defineGotContract } from './define';

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

export const Rights = gotApiContract.xGotTokens.rights;
export const EdgeDirection = gotApiContract.xGotTokens.edgeDirections;
export const Prefixes = gotApiContract.xGotTokens.prefixes;
