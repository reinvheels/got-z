# API Tests

HTTP integration tests for the got graph database API endpoints.

## Overview

These tests start the built got DB runtime and exercise the real HTTP API. No external server is required because each suite starts and stops its own runtime process.

## Running Tests

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run specific test file
bun test src/api.test.ts
```

Build `../db-runtime/zig-out/bin/db-runtime` before running these tests.

## Test Architecture

The tests automatically:
1. Choose a free localhost port
2. Start the built DB runtime in a temporary data directory
3. Exercise the real `/push` and `/pull` endpoints
4. Clean up the runtime process and temporary directory after tests complete

No external dependencies or running servers required!

## Test Coverage

The tests focus on HTTP behavior and endpoint availability:

### Push Endpoint (`POST /push`)
- Basic node creation
- Nodes with rights
- Nodes with edges
- Actor nodes
- HTTP error handling (invalid content type, wrong HTTP method)

### Pull Endpoint (`POST /pull`)
- Basic property queries
- Nested properties queries
- Edges queries
- Rights queries
- Actor nodes queries
- HTTP error handling (invalid content type, wrong HTTP method)

**Note:** Request/response schema validation is tested separately in the `api-spec` package.

## Runtime Harness

`src/runtime-harness.ts` provides shared process management for all suites:
- Runtime binary checks
- Free port allocation
- Temporary data directories
- Startup health checks
- Runtime cleanup
- WAL entry waiting for persistence tests

## Test Philosophy

These tests focus on HTTP transport concerns:
- Network connectivity
- HTTP status codes
- Content-Type headers
- HTTP method validation
- Basic response structure

Schema validation is handled separately in the `api-spec` package to avoid duplication.
