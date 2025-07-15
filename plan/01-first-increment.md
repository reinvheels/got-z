# First Increment: Basic HTTP Server with Push/Pull API

## Overview
Start with a minimal HTTP server using a simple push/pull model. This provides a foundation for the graph API while keeping the scope extremely manageable with just two endpoints.

## Implementation Scope
- **Language**: Zig (as specified in project plan)
- **HTTP Server**: Basic HTTP server with routing
- **Data Storage**: In-memory storage (no persistence yet)
- **Operations**: Push data to server, pull data from server

## API Endpoints
```
POST   /push          - Push graph data (nodes/edges) to server
GET    /pull          - Pull all graph data from server
```

## Push Endpoint
- **Method**: POST /push
- **Body**: JSON with nodes and/or edges arrays
- **Behavior**: Merges incoming data with existing graph (upsert by ID)
- **Response**: Success/failure status

### Data Structure
Represent graph data as JSON with keys being node IDs and values being node properties.

#### Example Request
```json
{
  "node-1": {
    "property1": "value1",
    "property2": "value2"
  },
  "node-2": {
    "property1": "value1",
    "property2": "value2"
  }
}
```

## Pull Endpoint
- **Method**: GET /pull
- **Response**: Queried graph data 

### Data Structure
Response should be a JSON object with all queried nodes and edges.

#### Example Request
```json
{
  "node-1": {
    "property2": true
  },
  "node-2": {
    "property1": true
  }
}
```
#### Example Response
```json
{
  "node-1": {
    "property2": "value2"
  },
  "node-2": {
    "property1": "value1"
  }
}
```

## Success Criteria
- Server starts and responds to HTTP requests
- Both endpoints work correctly
- Basic error handling (400, 500)
- JSON request/response format
- Simple validation for graph data structure

## What's NOT Included
- Persistence (comes in increment 2)
- Authentication/permissions (comes in increment 3)
- Advanced querying (comes in increment 4)
- Performance optimization (comes in increment 5)
- Changesets/history (comes in increment 6)

## Why This First?
This push/pull model is the simplest possible API - just two endpoints that handle all graph operations. It's extremely easy to test, provides immediate value for basic graph storage/retrieval, and establishes the HTTP infrastructure and data model without complexity.