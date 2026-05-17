export type ContractStatus = "implemented" | "planned" | "partial";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { readonly [key: string]: JsonValue };

export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

export type MediaTypeSpec = {
  readonly schemaRef: string;
};

export type RequestBodySpec = {
  readonly required: boolean;
  readonly content: {
    readonly "application/json": MediaTypeSpec;
  };
};

export type ResponseSpec = {
  readonly description: string;
  readonly content?: {
    readonly "application/json": MediaTypeSpec;
  };
};

export type OperationSpec = {
  readonly operationId: string;
  readonly status: ContractStatus;
  readonly summary: string;
  readonly description: string;
  readonly requestBody?: RequestBodySpec;
  readonly responses: Readonly<Record<string, ResponseSpec>>;
};

export type PathItemSpec = Partial<Readonly<Record<HttpMethod, OperationSpec>>>;

export type SchemaSpec = {
  readonly status: ContractStatus;
  readonly description: string;
  readonly type: "object" | "string" | "number" | "boolean" | "array";
  readonly xGotShape?: string;
};

export type ExampleSpec = {
  readonly summary: string;
  readonly status: ContractStatus;
  readonly description: string;
  readonly value: {
    readonly push?: JsonObject;
    readonly pull?: JsonObject;
    readonly result?: JsonObject;
  };
};

export type KeyGrammarSpec = {
  readonly context: string;
  readonly status: ContractStatus;
  readonly meaning: string;
  readonly token?: string;
  readonly plannedTokens?: readonly string[];
};

export type TokenMapSpec = Readonly<Record<string, string>>;

export type TokenSpec = {
  readonly rights: TokenMapSpec;
  readonly edgeDirections: TokenMapSpec;
  readonly prefixes: TokenMapSpec;
};

export type SemanticRuleSpec = {
  readonly status: ContractStatus;
  readonly when: string;
  readonly effect: string;
};

export type RuntimeModeSpec = {
  readonly status: ContractStatus;
  readonly default?: boolean;
  readonly flag?: string;
  readonly storageEngine: string;
  readonly durability: string;
};

export type ConformanceSpec = {
  readonly status: ContractStatus;
  readonly exampleRef: string;
  readonly mode: "run" | "skip";
  readonly reason?: string;
};

export type LimitationSpec = {
  readonly status: ContractStatus;
  readonly description: string;
};

export type GotApiContract = {
  readonly openapi: "3.1.0";
  readonly info: {
    readonly title: string;
    readonly version: string;
    readonly status: ContractStatus;
    readonly description: string;
  };
  readonly paths: Readonly<Record<string, PathItemSpec>>;
  readonly components: {
    readonly schemas: Readonly<Record<string, SchemaSpec>>;
    readonly examples: Readonly<Record<string, ExampleSpec>>;
  };
  readonly xGotTokens: TokenSpec;
  readonly xGotKeyGrammar: Readonly<Record<string, KeyGrammarSpec>>;
  readonly xGotSemantics: Readonly<Record<string, SemanticRuleSpec>>;
  readonly xGotRuntimeModes: Readonly<Record<string, RuntimeModeSpec>>;
  readonly xGotConformance: Readonly<Record<string, ConformanceSpec>>;
  readonly xGotLimitations: Readonly<Record<string, LimitationSpec>>;
};

export function defineGotContract<const T extends GotApiContract>(contract: T): T {
  return contract;
}
