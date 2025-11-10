/**
 * Core types for the env-code-agent system
 */

export interface APIEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  queryParams?: string[];
  pathParams?: string[];
  requestBody?: any;
  responseExample?: any;
  responseSchema?: SchemaField[];
}

export interface SchemaField {
  name: string;
  type: 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB' | 'NULL';
  nullable: boolean;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  foreignKey?: {
    table: string;
    column: string;
  };
}

export interface DatabaseTable {
  name: string;
  fields: SchemaField[];
  data: any[];
}

export interface DatabaseSchema {
  tables: DatabaseTable[];
}

export interface CloneConfig {
  targetUrl: string;
  outputDir: string;
  endpoints?: string[];
  validate?: boolean;
  maxDepth?: number;
  timeout?: number;
}

export interface ExplorationResult {
  endpoints: APIEndpoint[];
  baseUrl: string;
  discoveredAt: Date;
}

export interface GenerationResult {
  outputPath: string;
  filesGenerated: string[];
  schema: DatabaseSchema;
  endpoints: APIEndpoint[];
}

export interface ValidationResult {
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  fidelity: number; // 0-100%
  errors: ValidationError[];
}

export interface ValidationError {
  endpoint: string;
  expected: any;
  actual: any;
  diff: string;
}
