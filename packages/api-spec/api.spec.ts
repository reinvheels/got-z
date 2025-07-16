import { test, expect } from 'bun:test';
import { PushRequestSchema, PullRequestSchema, PullResponseSchema, Rights, EdgeDirection, Prefixes } from '@got-z/api-spec';

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
      [`${EdgeDirection.OUT}relationship1`]: {
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

// Test basic pull request validation
test('validates basic pull request', () => {
  const validRequest = {
    'node-1': {
      property2: true,
    },
    'node-2': {
      property1: true,
    },
  };

  const result = PullRequestSchema.safeParse(validRequest);
  expect(result.success).toBe(true);
});

// Test pull request with nested properties
test('validates pull request with nested properties', () => {
  const requestWithNested = {
    'node-1': {
      property1: {
        subproperty1: true,
        subproperty2: true,
      },
      property2: true,
    },
  };

  const result = PullRequestSchema.safeParse(requestWithNested);
  expect(result.success).toBe(true);
});

// Test pull request with edges
test('validates pull request with edges', () => {
  const requestWithEdges = {
    'node-1': {
      [`${EdgeDirection.OUT}relationship1`]: true,
    },
    'node-2': {
      [`${EdgeDirection.IN}relationship2`]: {
        id: true,
        nodeProperty1: true,
        [`${Prefixes.EDGE_PROPERTY}edgeProperty1`]: true,
        [`${Prefixes.EDGE_PROPERTY}order`]: true,
      },
    },
  };

  const result = PullRequestSchema.safeParse(requestWithEdges);
  expect(result.success).toBe(true);
});

// Test pull request with rights
test('validates pull request with rights', () => {
  const requestWithRights = {
    'node-1': {
      property1: true,
      [`${Prefixes.RIGHTS}`]: {
        name: true,
      },
    },
    'node-2': {
      property1: true,
      [`${Prefixes.RIGHTS}user123`]: true,
      [`${Prefixes.RIGHTS}group456`]: true,
    },
  };

  const result = PullRequestSchema.safeParse(requestWithRights);
  expect(result.success).toBe(true);
});

// Test pull request with actor nodes
test('validates pull request with actor nodes', () => {
  const actorRequest = {
    [`${Prefixes.RIGHTS}user123`]: {
      name: true,
      email: true,
    },
    [`${Prefixes.RIGHTS}group456`]: {
      name: true,
      [`${Prefixes.RIGHTS}user123`]: true,
    },
  };

  const result = PullRequestSchema.safeParse(actorRequest);
  expect(result.success).toBe(true);
});