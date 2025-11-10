/**
 * Seed Database Generator
 * Creates seed.db from inferred schema and sample data
 */

import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { DatabaseSchema, DatabaseTable, SchemaField } from '../types.js';

export class SeedGenerator {
  /**
   * Generate seed.db from schema and data
   */
  generateSeed(schema: DatabaseSchema, outputPath: string): void {
    console.log(`📦 Generating seed database at ${outputPath}...`);

    // Ensure directory exists
    const dir = dirname(outputPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Create database
    const db = new Database(outputPath);

    try {
      // Enable WAL mode and foreign keys (Fleet requirements)
      db.pragma('journal_mode = WAL');
      db.pragma('foreign_keys = ON');

      // Create tables
      for (const table of schema.tables) {
        this.createTable(db, table);
      }

      // Insert data
      for (const table of schema.tables) {
        this.insertData(db, table);
      }

      console.log(`✅ Seed database created with ${schema.tables.length} tables`);
    } finally {
      db.close();
    }
  }

  /**
   * Generate schema.sql from database
   */
  generateSchemaSQL(schema: DatabaseSchema, outputPath: string): void {
    console.log(`📝 Generating schema.sql at ${outputPath}...`);

    let sql = '-- Generated schema for Fleet environment\n';
    sql += '-- This file should be committed to the repository\n\n';

    for (const table of schema.tables) {
      sql += this.generateTableSQL(table);
      sql += '\n\n';
    }

    // Write to file
    import('fs').then(fs => {
      fs.writeFileSync(outputPath, sql, 'utf-8');
    });

    console.log(`✅ Schema SQL generated`);
  }

  /**
   * Create a table in the database
   */
  private createTable(db: Database.Database, table: DatabaseTable): void {
    const sql = this.generateTableSQL(table);
    db.exec(sql);
    console.log(`  ✓ Created table: ${table.name}`);
  }

  /**
   * Generate CREATE TABLE SQL
   */
  private generateTableSQL(table: DatabaseTable): string {
    let sql = `CREATE TABLE IF NOT EXISTS ${table.name} (\n`;

    const columns: string[] = [];

    for (const field of table.fields) {
      let columnDef = `  ${field.name} ${field.type}`;

      if (field.primaryKey) {
        columnDef += ' PRIMARY KEY';
        if (field.autoIncrement) {
          columnDef += ' AUTOINCREMENT';
        }
      }

      if (!field.nullable && !field.primaryKey) {
        columnDef += ' NOT NULL';
      }

      if (field.foreignKey) {
        columnDef += ` REFERENCES ${field.foreignKey.table}(${field.foreignKey.column})`;
      }

      columns.push(columnDef);
    }

    sql += columns.join(',\n');
    sql += '\n);';

    return sql;
  }

  /**
   * Insert data into table
   */
  private insertData(db: Database.Database, table: DatabaseTable): void {
    if (table.data.length === 0) {
      console.log(`  ⊘ No data for table: ${table.name}`);
      return;
    }

    // Get field names
    const fields = table.fields.map(f => f.name);
    const placeholders = fields.map(() => '?').join(', ');
    const sql = `INSERT OR IGNORE INTO ${table.name} (${fields.join(', ')}) VALUES (${placeholders})`;

    const stmt = db.prepare(sql);

    let insertedCount = 0;
    for (const row of table.data) {
      try {
        const values = fields.map(field => {
          const value = row[field];
          // Handle nested objects/arrays - serialize as JSON
          if (value !== null && typeof value === 'object') {
            return JSON.stringify(value);
          }
          return value;
        });

        stmt.run(values);
        insertedCount++;
      } catch (error) {
        // Skip rows that fail (e.g., duplicate primary keys)
        console.log(`  ⚠ Skipped row in ${table.name}: ${error}`);
      }
    }

    console.log(`  ✓ Inserted ${insertedCount} rows into ${table.name}`);
  }

  /**
   * Sanitize schema SQL (remove CHECK constraints per Fleet requirements)
   */
  sanitizeSchemaSQL(sqlContent: string): string {
    // Remove CHECK constraints
    let sanitized = sqlContent.replace(/CHECK\s*\([^)]+\)/gi, '');

    // Clean up extra commas and whitespace
    sanitized = sanitized.replace(/,\s*,/g, ',');
    sanitized = sanitized.replace(/,\s*\)/g, ')');

    return sanitized;
  }
}
