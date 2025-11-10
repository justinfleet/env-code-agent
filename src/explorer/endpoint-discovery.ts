/**
 * API Endpoint Discovery Module
 * Discovers available endpoints through multiple strategies
 */

import type { APIEndpoint, ExplorationResult } from '../types.js';

export class EndpointDiscovery {
  private baseUrl: string;
  private discovered: Map<string, APIEndpoint>;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.discovered = new Map();
  }

  /**
   * Main discovery method - tries multiple strategies
   */
  async discoverEndpoints(): Promise<ExplorationResult> {
    console.log(`🔍 Discovering endpoints at ${this.baseUrl}...`);

    // Strategy 1: Check for OpenAPI/Swagger documentation
    await this.tryOpenAPIDiscovery();

    // Strategy 2: Probe common API patterns
    await this.probeCommonPatterns();

    // Strategy 3: Check for API documentation endpoints
    await this.tryDocumentationEndpoints();

    const endpoints = Array.from(this.discovered.values());
    console.log(`✅ Discovered ${endpoints.length} endpoints`);

    return {
      endpoints,
      baseUrl: this.baseUrl,
      discoveredAt: new Date()
    };
  }

  /**
   * Strategy 1: Try to find OpenAPI/Swagger spec
   */
  private async tryOpenAPIDiscovery(): Promise<void> {
    const commonSpecPaths = [
      '/swagger.json',
      '/openapi.json',
      '/api-docs',
      '/api/swagger.json',
      '/api/openapi.json',
      '/docs/swagger.json'
    ];

    for (const path of commonSpecPaths) {
      try {
        const response = await fetch(`${this.baseUrl}${path}`);
        if (response.ok) {
          const spec = await response.json();
          console.log(`📄 Found OpenAPI spec at ${path}`);
          this.parseOpenAPISpec(spec);
          return;
        }
      } catch (error) {
        // Continue to next path
      }
    }
  }

  /**
   * Parse OpenAPI specification
   */
  private parseOpenAPISpec(spec: any): void {
    if (!spec.paths) return;

    for (const [path, pathItem] of Object.entries(spec.paths as any)) {
      for (const [method, operation] of Object.entries(pathItem as any)) {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
          const endpoint: APIEndpoint = {
            path: path,
            method: method.toUpperCase() as any,
            queryParams: this.extractQueryParams(operation),
            pathParams: this.extractPathParams(path)
          };
          this.discovered.set(`${method.toUpperCase()} ${path}`, endpoint);
        }
      }
    }
  }

  /**
   * Strategy 2: Probe common REST API patterns
   */
  private async probeCommonPatterns(): Promise<void> {
    const commonPaths = [
      '/api',
      '/api/v1',
      '/v1',
      '/api/products',
      '/api/users',
      '/api/orders',
      '/api/items',
      '/api/search',
      '/api/accounts',
      '/api/cart',
      '/api/reviews'
    ];

    for (const path of commonPaths) {
      await this.probeEndpoint(path, 'GET');
    }
  }

  /**
   * Strategy 3: Try documentation endpoints
   */
  private async tryDocumentationEndpoints(): Promise<void> {
    const docPaths = ['/docs', '/api/docs', '/api-docs', '/documentation'];

    for (const path of docPaths) {
      try {
        const response = await fetch(`${this.baseUrl}${path}`);
        if (response.ok) {
          const html = await response.text();
          // Look for API endpoint references in HTML
          this.extractEndpointsFromHTML(html);
        }
      } catch (error) {
        // Continue
      }
    }
  }

  /**
   * Probe a specific endpoint to see if it exists
   */
  private async probeEndpoint(path: string, method: string = 'GET'): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok || response.status === 400) { // 400 means endpoint exists but needs params
        const endpoint: APIEndpoint = {
          path,
          method: method as any,
          pathParams: this.extractPathParams(path)
        };

        // Try to get example response
        if (response.ok) {
          try {
            endpoint.responseExample = await response.json();
          } catch (e) {
            // Not JSON, skip
          }
        }

        this.discovered.set(`${method} ${path}`, endpoint);
        console.log(`  ✓ Found: ${method} ${path}`);
        return true;
      }
    } catch (error) {
      // Endpoint doesn't exist or network error
    }
    return false;
  }

  /**
   * Extract query parameters from OpenAPI operation
   */
  private extractQueryParams(operation: any): string[] {
    if (!operation.parameters) return [];
    return operation.parameters
      .filter((p: any) => p.in === 'query')
      .map((p: any) => p.name);
  }

  /**
   * Extract path parameters from URL pattern
   */
  private extractPathParams(path: string): string[] {
    const matches = path.match(/\{([^}]+)\}/g);
    if (!matches) return [];
    return matches.map(m => m.slice(1, -1));
  }

  /**
   * Extract endpoint references from HTML documentation
   */
  private extractEndpointsFromHTML(html: string): void {
    // Simple regex to find common API path patterns
    const pathRegex = /['"](\/api[^'"]*)['"]/g;
    let match;

    while ((match = pathRegex.exec(html)) !== null) {
      const path = match[1];
      if (!this.discovered.has(`GET ${path}`)) {
        this.probeEndpoint(path, 'GET');
      }
    }
  }

  /**
   * Get all discovered endpoints
   */
  getEndpoints(): APIEndpoint[] {
    return Array.from(this.discovered.values());
  }
}
