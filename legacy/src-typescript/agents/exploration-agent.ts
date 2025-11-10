/**
 * Exploration Agent
 * Autonomously explores an API to understand its structure and behavior
 */

import { BaseAgent } from '../core/base-agent.js';
import { EXPLORATION_TOOLS } from '../tools/tool-definitions.js';
import type { LLMClient } from '../core/llm-client.js';
import type { ToolExecutionContext } from '../tools/tool-executor.js';

const EXPLORATION_SYSTEM_PROMPT = `You are an expert API explorer. Your job is to autonomously explore an API to understand its complete structure and behavior.

## Your Goals:
1. Discover all available endpoints (GET, POST, PUT, DELETE, etc.)
2. Understand the data models and relationships
3. Identify CRUD patterns and business logic
4. Map state-changing operations
5. Understand validation rules and error handling
6. Identify authentication/authorization requirements

## Your Approach:
- Start with common patterns: /health, /api, /api/v1, etc.
- When you find a collection endpoint (e.g., /api/products), look for single-item endpoints (e.g., /api/products/{id})
- Test pagination, filtering, sorting on list endpoints
- For POST endpoints, try valid and invalid data to understand validation
- Look for relationships (e.g., products → categories, orders → items)
- Pay attention to response structures and infer database schema
- Note any authentication headers or tokens required

## Available Tools:
- make_http_request: Make HTTP requests to explore endpoints
- record_observation: Document your findings
- complete_exploration: Signal when you've gathered enough information

## Strategy:
1. Start broad: Find main resource endpoints
2. Go deep: Explore each resource thoroughly
3. Find relationships: Look for foreign keys and nested resources
4. Test edge cases: Try invalid inputs, missing params, etc.
5. Document everything: Record observations as you go

Remember: Be systematic and thorough. The quality of your exploration determines how well we can clone this API.`;

export interface ExplorationResult {
  endpoints: any[];
  observations: any[];
  dataModels: any[];
  relationships: any[];
}

export class ExplorationAgent extends BaseAgent {
  constructor(llm: LLMClient, context: ToolExecutionContext) {
    super({
      llm,
      tools: EXPLORATION_TOOLS,
      systemPrompt: EXPLORATION_SYSTEM_PROMPT,
      maxIterations: 100,
      context
    });
  }

  /**
   * Explore the target API
   */
  async explore(): Promise<ExplorationResult> {
    const initialPrompt = `Explore the API at ${this.executor['context'].targetUrl}.

Start by testing common endpoints like:
- /health or /api/health
- /api
- /api/v1
- Common resource patterns like /api/products, /api/users, /api/orders

Be systematic:
1. First, discover what endpoints exist
2. Then, explore each endpoint in depth
3. Look for patterns and relationships
4. Document everything you learn

When you've thoroughly explored the API and feel you have a complete understanding, use the complete_exploration tool.`;

    const result = await this.run(initialPrompt);

    // Parse exploration results from conversation
    // For now, return a simple structure
    // TODO: Extract structured data from observations

    return {
      endpoints: [],
      observations: [],
      dataModels: [],
      relationships: []
    };
  }
}
