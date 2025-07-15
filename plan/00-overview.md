I want to build a new graph data API. It should consist of the following sections:

# Project Plan for Graph Data API
## 1. Introduction
This document outlines the project plan for developing a Graph Data API that will allow users to interact with graph data structures efficiently. The API will support operations such as creating, reading, updating, and deleting graph nodes and edges.
## 2. Objectives
- Develop a JSON based HTTP API for graph data management.
- Ensure high performance and scalability.
- Provide comprehensive documentation for developers.
- Simple unix inspired user and permissions management.
- Simple and intuitive design for non-technical users.
## 3. Scope
- The API will support basic graph operations: create, read, update, delete (CRUD)
- Support for directed graphs.
- Ability to handle large datasets efficiently.
- User and permissions management at the API level.
- Custom database engine built in Zig for performance.
## 4. Requirements
### Functional Requirements
- Users must be able to create nodes and edges.
- Users must be able to retrieve nodes and edges.
- Users must be able to update nodes and edges.
- Users must be able to delete nodes and edges.
- Users must be able to manage permissions for nodes.
    - Users must be able to assign roles to users.
    - Users must be able to set permissions for roles.
    - Users must be able to view permissions for nodes.
    - permission types: read, write, admin.
- The API must support querying nodes and edges based on properties.
### Non-Functional Requirements
- The API must be able to handle at least 10,000 requests per second.
- The API must have a response time of less than 100ms for 95% of requests.
- The API should store changesets over time across all nodes and edges.
    - Changesets should be associated with user and request metadata. (e.g., user ID, request ID, timestamp).