/**
 * Tool execution logic
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import Database from 'better-sqlite3';

export interface ToolExecutionContext {
  targetUrl: string;
  outputDir: string;
  db?: Database.Database;
}

export class ToolExecutor {
  private context: ToolExecutionContext;

  constructor(context: ToolExecutionContext) {
    this.context = context;
  }

  /**
   * Execute a tool call
   */
  async execute(toolName: string, input: any): Promise<any> {
    switch (toolName) {
      case 'make_http_request':
        return await this.makeHttpRequest(input);

      case 'record_observation':
        return this.recordObservation(input);

      case 'complete_exploration':
        return this.completeExploration(input);

      case 'write_file':
        return this.writeFile(input);

      case 'read_file':
        return this.readFile(input);

      case 'execute_sql':
        return this.executeSql(input);

      case 'complete_generation':
        return this.completeGeneration(input);

      case 'test_endpoint':
        return await this.testEndpoint(input);

      case 'suggest_fix':
        return this.suggestFix(input);

      case 'complete_validation':
        return this.completeValidation(input);

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  /**
   * Make HTTP request to target API
   */
  private async makeHttpRequest(input: any): Promise<any> {
    const { method, path, query_params, body, headers } = input;

    let url = `${this.context.targetUrl}${path}`;

    // Add query params
    if (query_params) {
      const params = new URLSearchParams(query_params);
      url += `?${params.toString()}`;
    }

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, fetchOptions);
      const responseBody = await this.parseResponse(response);

      return {
        success: true,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseBody
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Parse response body
   */
  private async parseResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      try {
        return await response.json();
      } catch (e) {
        return null;
      }
    }

    return await response.text();
  }

  /**
   * Record observation
   */
  private recordObservation(input: any): any {
    // Store observation (could be in memory or file)
    console.log(`📝 Observation: ${input.observation}`);
    return { success: true, message: 'Observation recorded' };
  }

  /**
   * Complete exploration
   */
  private completeExploration(input: any): any {
    console.log(`✅ Exploration complete: ${input.summary}`);
    return { success: true, complete: true };
  }

  /**
   * Write file
   */
  private writeFile(input: any): any {
    const { path, content } = input;
    const fullPath = join(this.context.outputDir, path);

    // Ensure directory exists
    const dir = dirname(fullPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(fullPath, content, 'utf-8');
    console.log(`✓ Wrote file: ${path}`);

    return { success: true, path };
  }

  /**
   * Read file
   */
  private readFile(input: any): any {
    const { path } = input;
    const fullPath = join(this.context.outputDir, path);

    if (!existsSync(fullPath)) {
      return { success: false, error: 'File not found' };
    }

    const content = readFileSync(fullPath, 'utf-8');
    return { success: true, content };
  }

  /**
   * Execute SQL
   */
  private executeSql(input: any): any {
    const { query } = input;

    if (!this.context.db) {
      return { success: false, error: 'Database not initialized' };
    }

    try {
      const result = this.context.db.prepare(query).all();
      return { success: true, result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Complete generation
   */
  private completeGeneration(input: any): any {
    console.log(`✅ Generation complete: ${input.summary}`);
    return { success: true, complete: true };
  }

  /**
   * Test endpoint on both APIs
   */
  private async testEndpoint(input: any): Promise<any> {
    const { method, path, query_params, body } = input;

    // Test original API
    const originalResult = await this.makeHttpRequest({
      method,
      path,
      query_params,
      body
    });

    // Test clone API (assumes running on different port)
    const cloneUrl = this.context.targetUrl.replace('3000', '3001');
    const cloneContext = { ...this.context, targetUrl: cloneUrl };
    const cloneExecutor = new ToolExecutor(cloneContext);

    const cloneResult = await cloneExecutor.makeHttpRequest({
      method,
      path,
      query_params,
      body
    });

    return {
      original: originalResult,
      clone: cloneResult,
      match: JSON.stringify(originalResult.body) === JSON.stringify(cloneResult.body)
    };
  }

  /**
   * Suggest fix
   */
  private suggestFix(input: any): any {
    console.log(`🔧 Fix suggested for ${input.file_path}: ${input.issue}`);
    return { success: true, fix_recorded: true };
  }

  /**
   * Complete validation
   */
  private completeValidation(input: any): any {
    console.log(`✅ Validation complete: ${input.fidelity_score}% fidelity`);
    return { success: true, complete: true, fidelity: input.fidelity_score };
  }
}
