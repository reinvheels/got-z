import { z } from 'zod';
import { gotzApiContract } from './contract';
export { gotzApiContract };
export type {
  ContractStatus,
  ExampleSpec,
  GotzApiContract,
  KeyGrammarSpec,
  OperationSpec,
  PathItemSpec,
  TokenMapSpec,
  TokenSpec,
} from './define';
export { defineGotzContract } from './define';

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

export const Rights = gotzApiContract.xGotzTokens.rights;
export const EdgeDirection = gotzApiContract.xGotzTokens.edgeDirections;
export const Prefixes = gotzApiContract.xGotzTokens.prefixes;
