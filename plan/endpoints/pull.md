# Basic
Pull multiple nodes as JSON based on a JSON query.

## Example Request
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

## Example Response
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

# Nested Properties on Same Node
Pull nodes with nested properties, where keys are node IDs and values are objects containing properties.

## Example Request
```json
{
  "node-1": {
    "property1": {
      "subproperty1": true,
      "subproperty2": true
    },
    "property2": true
  },
  "node-2": {
    "property1": {
      "subproperty1": true
    },
    "property2": true
  }
}
```

## Example Response
```json
{
  "node-1": {
    "property1": {
      "subproperty1": "value1",
      "subproperty2": "value2"
    },
    "property2": "value2"
  },
  "node-2": {
    "property1": {
      "subproperty1": "value1"
    },
    "property2": "value2"
  }
}
```

# Pull Edges and Connected Nodes
Pull edges between nodes, where keys are node IDs and values are objects containing node and edge properties. Node properties are denomidated with only the property name, while edge properties are denomidated with the edge property denominator `-`.

The key of an edge property is starting with an edge denominator (<,> or <>) to indicate it is an edge including the direction of the edge. `<>` indicates edges that are incoming or outgoing, `>` indicates an outgoing edge, and `<` indicates an incoming edge.

After the edge denominator, the edge key consists of a string denoting the relationship name.

If the relationship is requested with true, it indicates that the edge should be included without properties and without the node properties. Meaning that all nodes that are connected by this edge should be included in the response.

Under the edge key, the value is an object with the target node ID as the key and edge properties being true if the property should be included. If the edge has no properties, the value can be set to true to indicate the edge should be included without properties.

## Example Request
```json
{
  "node-1": {
    ">relationship1": true
  },
  "node-2": {
    "<relationship2": {
      "id": true,
      "nodeProperty1": true,
      "-edgeProperty1": true,
      "-order": true
    }
  },
  "<>sibling": true
}
```

## Example Response
```json
{
  "node-1": {
    ">relationship1": [{
      "id": "node-2",
    }]
  },
  "node-2": {
    "<relationship2": [{
        "id": "node-3",
        "nodeProperty1": "value1",
        "-edgeProperty1": "value1",
        "-order": 1
      }]
    },
    "<>sibling": [{
      "id": "node-4"
    }]
  }
}
```

# Pull Nodes with Rights
Pull nodes with rights, where keys are node IDs and values are objects containing node properties and rights.

A single `@` is used to pull all actor nodes that have rights to the node.

An `@` followed by a user or group ID is used to pull specific actor nodes with rights to the node.

## Example Request
```json
{
  "node-1": {
    "property1": true,
    "property2": true,
    "@": {
      "name": true,
    },
  },
  "node-2": {
    "property1": true,
    "@": true,
  },
  "node-3": {
    "property1": true,
    "@user123": true,
    "@group456": true
  }
}
```

## Example Response
```json
{
  "node-1": {
    "property1": "value1",
    "property2": "value2",
    "@user123": {
      "@": "rw",
      "name": "User One"
    },
    "@group456": {
      "@": "r",
      "name": "Group One"
    },
    "@admin": {
      "@": "r",
      "name": "Admin User"
    }
  },
  "node-2": {
    "property1": "value1",
    "@user123": {
      "@": "r"
    },
    "@public": {
      "@": "r"
    }
  },
  "node-3": {
    "property1": "value1",
    "@user123": {
      "@": "rwa"
    },
    "@group456": {
      "@": "r"
    },
    "@admin": {
      "@": "a"
    }
  }
}
```

# Actor Nodes
Pull actor nodes, where keys are node IDs and values are objects containing actor properties.

## Example Request
```json
{
  "@user123": {
    "name": true,
    "email": true,
  },
  "@group456": {
    "name": true,
    "@user123": true
  }
}
```

## Example Response
```json
{
  "@user123": {
    "name": "User One",
    "email": "user1@example.com"
  },
  "@group456": {
    "name": "Group One",
    "@user123": {
      "@": "b"
    }
  }
}