# API Tests

HTTP integration tests for the Got-Z graph database API endpoints.

## Overview

These tests use a built-in dummy HTTP server that simulates the Got-Z API responses. No external server is required - the tests are completely self-contained.

## Running Tests

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run specific test file
bun test api.test.ts
```

## Test Architecture

The tests automatically:
1. Spin up a dummy HTTP server on port 3001 before running tests
2. Mock realistic API responses for both endpoints
3. Clean up the server after tests complete

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

## Mock Server Features

The dummy server provides:
- Mock JSON responses for testing HTTP behavior
- Proper HTTP status codes (200, 400, 405)
- Content-Type validation
- HTTP method validation
- JSON response formatting

## Test Philosophy

These tests focus on HTTP transport concerns:
- Network connectivity
- HTTP status codes
- Content-Type headers
- HTTP method validation
- Basic response structure

Schema validation is handled separately in the `api-spec` package to avoid duplication.