# Basic
Push multiple nodes as JSON with keys being node IDs and values being node properties.

## Example Request
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

## Example Response
```json
{
  "status": 200,
  "name": "PushSuccess",
  "message": "Pushed successfully"
}
```

# Nested Properties on Same Node
Push nodes with nested properties, where keys are node IDs and values are objects containing properties.

## Example Request
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

# Associate Edge Between Nodes
Push edges between nodes, where keys are node IDs and values are objects containing edge properties.

The key of an edge property is starting with an edge denominator (<,> or <>) to indicate it is an edge including the direction of the edge. `<>` indicates that an incoming and an outgoing edge of the same relationship should be created, `>` indicates an outgoing edge, and `<` indicates an incoming edge.

After the edge denominator the edge key consists of a string denoting the relationship name.

Under the edge key, the value is an object with the target node ID as the key and edge properties as the values prefixed with a `-`. Also node properties can be set without the `-` prefix.

If the edge has no properties, the value can be set to true.

## Example Request
```json
{
  "node-1": {
    "property1": "value1",
    "property2": "value2",
    ">relationship1": {
      "node-2": {
        "-property1": "value1",
        "-order": 1
      }
    }
  },
  "node-2": {
    "property1": "value1",
    ">relationship2": {
      "node-3": true
    },
    "<relationship3": {
      "node-4": true
    },
    "<>sibling": {
      "node-5": true
    }
  }
}
```

# Associate Rights to Nodes
Push rights to nodes, where keys are node IDs and values are objects containing rights properties.

The rights can be set read, write, or admin. The rights are set as a string with characters representing the rights. For example, "rw" means read and write rights, "r" means only read rights, and "a" means admin rights.

Use the `@` symbol to denote rights properties in the node object.

## Example Request
```json
{
  "node-1": {
    "property1": "value1",
    "property2": "value2",
    "@user123": "rw",
    "@group456": "r",
    "@admin": "a"
  },
  "node-2": {
    "property1": "value1",
    "@user123": "r",
    "@public": "r"
  }
}
```

In this example:
- `@user123` has read-write access to node-1 and read-only access to node-2
- `@group456` has read-only access to node-1
- `@admin` has admin access to node-1
- `@public` has read-only access to node-2

# Actor Nodes
Push actor nodes, where keys are node IDs and values are objects containing actor properties.
Actor nodes are special nodes that represent users, groups or roles in the system. They can have properties like any other node.
Actor nodes can also have rights associated with them, similar to regular nodes. Actor nodes are preceded by the `@` symbol in the node ID.
There is an aditional right type `b` denoting that an actor node can "be" the other actor node. This is useful for roles and groups that can be assumed by other actors.

## Example Request
```json
{
  "@user123": {
    "name": "John Doe",
    "email": "john.doe@example.com",
  },
  "@group456": {
    "name": "Admins",
    "@user123": "b"
  },
  "@role789": {
    "name": "Editor",
    "@user123": "b" 
  }
}
```

