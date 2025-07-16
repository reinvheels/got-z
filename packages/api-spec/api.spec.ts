import { test, expect } from 'bun:test';
import { PushRequestSchema, PullResponseSchema, Rights, EdgeDirection, Prefixes } from '@got-z/api-spec';

// Test basic push request validation
test('validates basic push request', () => {
  const validRequest = {
    'node-1': {
      property1: 'value1',
      property2: 'value2',
    },
    'node-2': {
      property1: 'value1',
      property2: 'value2',
    },
  };

  const result = PushRequestSchema.safeParse(validRequest);
  expect(result.success).toBe(true);
});

// Test push request with rights
test('validates push request with rights', () => {
  const requestWithRights = {
    'node-1': {
      property1: 'value1',
      [`${Prefixes.RIGHTS}user123`]: Rights.READ + Rights.WRITE,
      [`${Prefixes.RIGHTS}admin`]: Rights.ADMIN,
    },
  };

  const result = PushRequestSchema.safeParse(requestWithRights);
  expect(result.success).toBe(true);
});

// Test push request with edges
test('validates push request with edges', () => {
  const requestWithEdges = {
    'node-1': {
      property1: 'value1',
      [`${EdgeDirection.OUTGOING}relationship1`]: {
        'node-2': {
          [`${Prefixes.EDGE_PROPERTY}property1`]: 'value1',
          [`${Prefixes.EDGE_PROPERTY}order`]: 1,
        },
      },
    },
  };

  const result = PushRequestSchema.safeParse(requestWithEdges);
  expect(result.success).toBe(true);
});

// Test pull response validation
test('validates pull response', () => {
  const validResponse = {
    'node-1': {
      property1: 'value1',
      property2: 'value2',
    },
    'node-2': {
      property1: 'value1',
    },
  };

  const result = PullResponseSchema.safeParse(validResponse);
  expect(result.success).toBe(true);
});

// Test actor nodes
test('validates actor nodes', () => {
  const actorNodes = {
    [`${Prefixes.RIGHTS}user123`]: {
      name: 'John Doe',
      email: 'john.doe@example.com',
    },
    [`${Prefixes.RIGHTS}group456`]: {
      name: 'Admins',
      [`${Prefixes.RIGHTS}user123`]: Rights.BE,
    },
  };

  const result = PushRequestSchema.safeParse(actorNodes);
  expect(result.success).toBe(true);
});