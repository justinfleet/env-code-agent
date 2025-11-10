/**
 * Tool definitions for LLM agents
 */

import type { Tool } from '@anthropic-ai/sdk/resources/messages.mjs';

export const EXPLORATION_TOOLS: Tool[] = [
  {
    name: 'make_http_request',
    description: 'Make an HTTP request to the target API to explore its behavior. Use this to discover endpoints, test parameters, and observe responses.',
    input_schema: {
      type: 'object',
      properties: {
        method: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
          description: 'HTTP method'
        },
        path: {
          type: 'string',
          description: 'URL path (e.g., /api/products or /api/products/123)'
        },
        query_params: {
          type: 'object',
          description: 'Query parameters as key-value pairs',
          additionalProperties: { type: 'string' }
        },
        body: {
          type: 'object',
          description: 'Request body for POST/PUT/PATCH requests'
        },
        headers: {
          type: 'object',
          description: 'Custom headers',
          additionalProperties: { type: 'string' }
        }
      },
      required: ['method', 'path']
    }
  },
  {
    name: 'record_observation',
    description: 'Record an observation about the API behavior. Use this to document what you learned from a request.',
    input_schema: {
      type: 'object',
      properties: {
        observation: {
          type: 'string',
          description: 'What you observed (e.g., "This endpoint returns paginated products")'
        },
        endpoint: {
          type: 'string',
          description: 'The endpoint this observation is about'
        },
        category: {
          type: 'string',
          enum: ['endpoint', 'data_model', 'relationship', 'validation', 'behavior'],
          description: 'Category of observation'
        }
      },
      required: ['observation', 'endpoint', 'category']
    }
  },
  {
    name: 'complete_exploration',
    description: 'Signal that exploration is complete and you have gathered enough information.',
    input_schema: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description: 'Summary of what was discovered'
        }
      },
      required: ['summary']
    }
  }
];

export const CODE_GENERATION_TOOLS: Tool[] = [
  {
    name: 'write_file',
    description: 'Write code or configuration to a file',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path relative to output directory'
        },
        content: {
          type: 'string',
          description: 'File content'
        }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'read_file',
    description: 'Read contents of an existing file',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path to read'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'execute_sql',
    description: 'Execute SQL query on the generated database',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'SQL query to execute'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'complete_generation',
    description: 'Signal that code generation is complete',
    input_schema: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description: 'Summary of what was generated'
        }
      },
      required: ['summary']
    }
  }
];

export const VALIDATION_TOOLS: Tool[] = [
  {
    name: 'test_endpoint',
    description: 'Test an endpoint on both original and clone APIs',
    input_schema: {
      type: 'object',
      properties: {
        method: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
        },
        path: {
          type: 'string'
        },
        query_params: {
          type: 'object',
          additionalProperties: { type: 'string' }
        },
        body: {
          type: 'object'
        }
      },
      required: ['method', 'path']
    }
  },
  {
    name: 'suggest_fix',
    description: 'Suggest a code fix for a discrepancy',
    input_schema: {
      type: 'object',
      properties: {
        issue: {
          type: 'string',
          description: 'Description of the issue'
        },
        file_path: {
          type: 'string',
          description: 'File that needs to be fixed'
        },
        suggested_change: {
          type: 'string',
          description: 'The suggested code change'
        }
      },
      required: ['issue', 'file_path', 'suggested_change']
    }
  },
  {
    name: 'complete_validation',
    description: 'Signal that validation is complete',
    input_schema: {
      type: 'object',
      properties: {
        fidelity_score: {
          type: 'number',
          description: 'Fidelity score (0-100)'
        },
        summary: {
          type: 'string',
          description: 'Validation summary'
        }
      },
      required: ['fidelity_score', 'summary']
    }
  }
];
