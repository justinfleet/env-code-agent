/**
 * Specification Builder Agent
 * Synthesizes exploration results into a structured specification
 */

import { LLMClient, type LLMMessage } from '../core/llm-client.js';

const SPECIFICATION_SYSTEM_PROMPT = `You are an expert API architect. Your job is to synthesize exploration findings into a complete, structured API specification.

## Your Task:
Given observations from API exploration, create a comprehensive specification including:

1. **OpenAPI Specification**: Complete endpoint documentation
2. **Database Schema**: Tables, fields, relationships, constraints
3. **Business Logic**: How endpoints interact with data
4. **Validation Rules**: Input validation and error handling
5. **Data Flow**: How state changes propagate

## Output Format:
Return a valid JSON object with this structure:

\`\`\`json
{
  "name": "API name",
  "description": "What this API does",
  "endpoints": [
    {
      "path": "/api/resource",
      "method": "GET",
      "description": "What it does",
      "parameters": [...],
      "response": {...},
      "logic": "How it's implemented"
    }
  ],
  "database": {
    "tables": [
      {
        "name": "table_name",
        "fields": [
          {"name": "id", "type": "INTEGER", "primaryKey": true, "autoIncrement": true},
          {"name": "name", "type": "TEXT", "nullable": false}
        ],
        "relationships": [...]
      }
    ]
  },
  "businessLogic": {
    "search": "How search works",
    "pagination": "How pagination works",
    "validation": "Validation rules"
  }
}
\`\`\`

Be thorough and accurate. The code generator will use this specification.`;

export interface APISpecification {
  name: string;
  description: string;
  endpoints: any[];
  database: {
    tables: any[];
  };
  businessLogic: any;
}

export class SpecificationAgent {
  private llm: LLMClient;

  constructor(llm: LLMClient) {
    this.llm = llm;
  }

  /**
   * Build specification from exploration results
   */
  async buildSpecification(explorationSummary: string): Promise<APISpecification> {
    console.log(`\n🏗️  Building API specification from exploration results...\n`);

    const messages: LLMMessage[] = [
      {
        role: 'user',
        content: `Based on this API exploration, create a complete specification:

${explorationSummary}

Generate a comprehensive JSON specification following the required format.`
      }
    ];

    const response = await this.llm.complete(messages, [], SPECIFICATION_SYSTEM_PROMPT);

    // Parse JSON from response
    try {
      // Extract JSON from response (might be wrapped in markdown)
      const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/) ||
                       response.content.match(/```\n([\s\S]*?)\n```/) ||
                       [null, response.content];

      const jsonStr = jsonMatch[1] || response.content;
      const spec = JSON.parse(jsonStr);

      console.log(`✅ Specification generated:`);
      console.log(`   • ${spec.endpoints?.length || 0} endpoints`);
      console.log(`   • ${spec.database?.tables?.length || 0} database tables`);

      return spec;
    } catch (error) {
      console.error('❌ Failed to parse specification:', error);
      throw new Error('Failed to generate valid specification');
    }
  }
}
