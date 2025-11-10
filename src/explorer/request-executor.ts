/**
 * Request Executor Module
 * Executes requests against discovered endpoints to gather examples
 */

import type { APIEndpoint } from '../types.js';

export interface RequestExample {
  endpoint: APIEndpoint;
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: any;
    queryParams?: Record<string, string>;
  };
  response: {
    status: number;
    headers: Record<string, string>;
    body: any;
  };
}

export class RequestExecutor {
  private baseUrl: string;
  private examples: RequestExample[];

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.examples = [];
  }

  /**
   * Execute requests for all endpoints to gather examples
   */
  async gatherExamples(endpoints: APIEndpoint[]): Promise<RequestExample[]> {
    console.log(`🧪 Gathering examples from ${endpoints.length} endpoints...`);

    for (const endpoint of endpoints) {
      await this.executeEndpoint(endpoint);
    }

    console.log(`✅ Gathered ${this.examples.length} examples`);
    return this.examples;
  }

  /**
   * Execute a single endpoint with various parameter combinations
   */
  private async executeEndpoint(endpoint: APIEndpoint): Promise<void> {
    const variants = this.generateRequestVariants(endpoint);

    for (const variant of variants) {
      try {
        const response = await fetch(variant.url, {
          method: variant.method,
          headers: variant.headers,
          body: variant.body ? JSON.stringify(variant.body) : undefined
        });

        const responseBody = await this.parseResponse(response);

        this.examples.push({
          endpoint,
          request: variant,
          response: {
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            body: responseBody
          }
        });

        console.log(`  ✓ ${variant.method} ${variant.url} → ${response.status}`);

        // Only get one successful example per endpoint for now
        if (response.ok) break;
      } catch (error) {
        console.log(`  ✗ ${variant.method} ${variant.url} → Error`);
      }
    }
  }

  /**
   * Generate different request variants for an endpoint
   */
  private generateRequestVariants(endpoint: APIEndpoint): Array<{
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: any;
    queryParams?: Record<string, string>;
  }> {
    const variants: any[] = [];
    let url = `${this.baseUrl}${endpoint.path}`;

    // Replace path parameters with sample values
    if (endpoint.pathParams && endpoint.pathParams.length > 0) {
      for (const param of endpoint.pathParams) {
        const sampleValue = this.generateSampleValue(param);
        url = url.replace(`{${param}}`, sampleValue).replace(`:${param}`, sampleValue);
      }
    }

    // Add query parameters if present
    if (endpoint.queryParams && endpoint.queryParams.length > 0) {
      const queryParams: Record<string, string> = {};
      for (const param of endpoint.queryParams) {
        queryParams[param] = this.generateSampleValue(param);
      }
      const queryString = new URLSearchParams(queryParams).toString();
      url = `${url}?${queryString}`;
    }

    variants.push({
      url,
      method: endpoint.method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: endpoint.method !== 'GET' ? this.generateSampleBody(endpoint) : undefined
    });

    return variants;
  }

  /**
   * Generate sample value for a parameter based on its name
   */
  private generateSampleValue(paramName: string): string {
    // Common parameter patterns
    if (paramName.includes('id') || paramName === 'asin') return '1';
    if (paramName.includes('page')) return '1';
    if (paramName.includes('limit')) return '10';
    if (paramName.includes('search') || paramName === 'q') return 'test';
    if (paramName.includes('category')) return 'electronics';
    if (paramName.includes('sort')) return 'relevance';

    return 'test';
  }

  /**
   * Generate sample request body for POST/PUT/PATCH endpoints
   */
  private generateSampleBody(endpoint: APIEndpoint): any {
    // For now, return empty object - can be enhanced later
    return {};
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
   * Get all collected examples
   */
  getExamples(): RequestExample[] {
    return this.examples;
  }
}
