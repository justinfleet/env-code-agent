/**
 * Schema Inference Module
 * Infers SQLite database schema from API response examples
 */

import type { DatabaseSchema, DatabaseTable, SchemaField } from '../types.js';
import type { RequestExample } from '../explorer/request-executor.js';

export class SchemaInference {
  private tables: Map<string, DatabaseTable>;

  constructor() {
    this.tables = new Map();
  }

  /**
   * Infer database schema from collected API examples
   */
  inferSchema(examples: RequestExample[]): DatabaseSchema {
    console.log(`🔬 Inferring database schema from ${examples.length} examples...`);

    for (const example of examples) {
      if (example.response.status === 200 && example.response.body) {
        this.analyzeResponseBody(example);
      }
    }

    console.log(`✅ Inferred ${this.tables.size} tables`);
    return {
      tables: Array.from(this.tables.values())
    };
  }

  /**
   * Analyze response body to extract table structure
   */
  private analyzeResponseBody(example: RequestExample): void {
    const body = example.response.body;

    // Handle different response structures
    if (Array.isArray(body)) {
      this.processArray(body, this.inferTableName(example.endpoint.path));
    } else if (typeof body === 'object' && body !== null) {
      // Check for common pagination patterns
      if (this.isPaginatedResponse(body)) {
        const dataKey = this.findDataKey(body);
        if (dataKey && Array.isArray(body[dataKey])) {
          this.processArray(body[dataKey], this.inferTableName(example.endpoint.path));
        }
      } else if (this.isSingleObject(body)) {
        // Single object response
        this.processObject(body, this.inferTableName(example.endpoint.path));
      } else {
        // Response might contain multiple collections
        for (const [key, value] of Object.entries(body)) {
          if (Array.isArray(value) && value.length > 0) {
            this.processArray(value, key);
          }
        }
      }
    }
  }

  /**
   * Process an array of objects into a table
   */
  private processArray(items: any[], tableName: string): void {
    if (items.length === 0) return;

    const normalizedTableName = this.normalizeTableName(tableName);
    const fields = this.inferFields(items);

    if (!this.tables.has(normalizedTableName)) {
      this.tables.set(normalizedTableName, {
        name: normalizedTableName,
        fields,
        data: items
      });
    } else {
      // Merge with existing table
      const existing = this.tables.get(normalizedTableName)!;
      existing.fields = this.mergeFields(existing.fields, fields);
      existing.data.push(...items);
    }
  }

  /**
   * Process a single object
   */
  private processObject(obj: any, tableName: string): void {
    this.processArray([obj], tableName);
  }

  /**
   * Infer fields from array of objects
   */
  private inferFields(items: any[]): SchemaField[] {
    const fieldMap = new Map<string, SchemaField>();

    // Analyze first few items to infer schema
    const sampleSize = Math.min(items.length, 10);
    for (let i = 0; i < sampleSize; i++) {
      const item = items[i];
      if (typeof item !== 'object' || item === null) continue;

      for (const [key, value] of Object.entries(item)) {
        const sqlType = this.inferSQLType(value);
        const isNullable = value === null || value === undefined;

        if (!fieldMap.has(key)) {
          fieldMap.set(key, {
            name: key,
            type: sqlType,
            nullable: isNullable,
            primaryKey: this.isPrimaryKeyField(key),
            autoIncrement: this.isPrimaryKeyField(key) && sqlType === 'INTEGER'
          });
        } else {
          // Update nullable status
          const existing = fieldMap.get(key)!;
          existing.nullable = existing.nullable || isNullable;
        }
      }
    }

    return Array.from(fieldMap.values());
  }

  /**
   * Infer SQLite type from JavaScript value
   */
  private inferSQLType(value: any): 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB' | 'NULL' {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'number') {
      return Number.isInteger(value) ? 'INTEGER' : 'REAL';
    }
    if (typeof value === 'string') return 'TEXT';
    if (typeof value === 'boolean') return 'INTEGER'; // SQLite stores booleans as 0/1
    if (typeof value === 'object') return 'TEXT'; // Store JSON as TEXT
    return 'TEXT';
  }

  /**
   * Check if field name indicates a primary key
   */
  private isPrimaryKeyField(fieldName: string): boolean {
    const pkPatterns = ['id', '_id', 'uuid', 'key'];
    return pkPatterns.some(pattern =>
      fieldName === pattern ||
      fieldName.endsWith('_id') && fieldName.split('_').length === 2
    );
  }

  /**
   * Check if response is paginated
   */
  private isPaginatedResponse(body: any): boolean {
    const paginationKeys = ['data', 'items', 'results', 'records', 'rows'];
    const metaKeys = ['total', 'count', 'page', 'limit', 'hasMore', 'next', 'previous'];

    const hasDataKey = paginationKeys.some(key => key in body);
    const hasMetaKey = metaKeys.some(key => key in body);

    return hasDataKey || hasMetaKey;
  }

  /**
   * Find the key containing the data array in a paginated response
   */
  private findDataKey(body: any): string | null {
    const dataKeys = ['data', 'items', 'results', 'records', 'rows'];
    for (const key of dataKeys) {
      if (key in body && Array.isArray(body[key])) {
        return key;
      }
    }
    return null;
  }

  /**
   * Check if response is a single object (not a collection)
   */
  private isSingleObject(body: any): boolean {
    // If it has common collection/pagination keys, it's not a single object
    const collectionKeys = ['data', 'items', 'results', 'total', 'count', 'page'];
    return !collectionKeys.some(key => key in body);
  }

  /**
   * Infer table name from endpoint path
   */
  private inferTableName(path: string): string {
    // Extract resource name from path
    // /api/products/123 -> products
    // /api/v1/users -> users
    const parts = path.split('/').filter(p => p && !p.match(/^(api|v\d+)$/));

    if (parts.length > 0) {
      // Take the last non-parameter part
      const lastPart = parts[parts.length - 1];
      // Remove path parameter patterns
      return lastPart.replace(/[{}:]/g, '').replace(/\d+/g, '');
    }

    return 'data';
  }

  /**
   * Normalize table name (pluralize, lowercase, etc.)
   */
  private normalizeTableName(name: string): string {
    let normalized = name.toLowerCase();

    // Remove common suffixes
    normalized = normalized.replace(/_?(list|data|response)$/, '');

    // Ensure plural for consistency
    if (!normalized.endsWith('s')) {
      // Simple pluralization
      if (normalized.endsWith('y')) {
        normalized = normalized.slice(0, -1) + 'ies';
      } else {
        normalized = normalized + 's';
      }
    }

    return normalized;
  }

  /**
   * Merge field definitions (for when we see same table multiple times)
   */
  private mergeFields(existing: SchemaField[], newFields: SchemaField[]): SchemaField[] {
    const merged = new Map<string, SchemaField>();

    // Add existing fields
    for (const field of existing) {
      merged.set(field.name, { ...field });
    }

    // Merge new fields
    for (const field of newFields) {
      if (!merged.has(field.name)) {
        merged.set(field.name, { ...field });
      } else {
        const existingField = merged.get(field.name)!;
        // Make nullable if either version is nullable
        existingField.nullable = existingField.nullable || field.nullable;
        // If types differ, prefer TEXT as it's most flexible
        if (existingField.type !== field.type) {
          existingField.type = 'TEXT';
        }
      }
    }

    return Array.from(merged.values());
  }

  /**
   * Get inferred schema
   */
  getSchema(): DatabaseSchema {
    return {
      tables: Array.from(this.tables.values())
    };
  }
}
