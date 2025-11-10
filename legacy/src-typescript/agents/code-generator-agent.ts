/**
 * Code Generator Agent
 * Generates Fleet-compliant code from API specification
 */

import { BaseAgent } from '../core/base-agent.js';
import { CODE_GENERATION_TOOLS } from '../tools/tool-definitions.js';
import type { LLMClient } from '../core/llm-client.js';
import type { ToolExecutionContext } from '../tools/tool-executor.js';
import type { APISpecification } from './specification-agent.js';

const CODE_GENERATION_SYSTEM_PROMPT = `You are an expert full-stack developer specializing in Fleet environment creation. Your job is to generate a complete, production-ready Fleet-compliant environment from an API specification.

## Fleet Environment Requirements:

### 1. Database (data/)
- Create \`seed.db\` with SQLite
- Enable WAL mode: \`PRAGMA journal_mode = WAL\`
- Enable foreign keys: \`PRAGMA foreign_keys = ON\`
- Use INTEGER AUTOINCREMENT for all primary keys
- Generate \`schema.sql\` WITHOUT CHECK constraints (Fleet requirement)
- Populate with realistic seed data

### 2. Server (src/)
- Express + TypeScript server
- Read DATABASE_PATH from environment (Fleet standard)
- Implement actual business logic, not mocks
- Generate SQL queries based on endpoints
- Handle errors properly
- Use compression, cors, helmet middleware

### 3. Configuration
- package.json with correct dependencies
- tsconfig.json for TypeScript
- .env.example for configuration
- Proper startup scripts

### 4. Determinism
- Use seeded random where needed
- Respect determinism shim
- Consistent sorting/ordering

## Your Workflow:
1. Start with database schema (data/schema.sql)
2. Create and populate seed.db
3. Generate server boilerplate (package.json, tsconfig, config)
4. Implement routes with actual logic
5. Add proper error handling
6. Write README with setup instructions

## Code Quality:
- Write production-ready code
- Add comments for complex logic
- Follow TypeScript best practices
- Implement actual database queries, not mocks
- Handle edge cases

When you've generated all necessary files, use complete_generation.`;

export class CodeGeneratorAgent extends BaseAgent {
  private specification: APISpecification;

  constructor(llm: LLMClient, context: ToolExecutionContext, specification: APISpecification) {
    super({
      llm,
      tools: CODE_GENERATION_TOOLS,
      systemPrompt: CODE_GENERATION_SYSTEM_PROMPT,
      maxIterations: 100,
      context
    });
    this.specification = specification;
  }

  /**
   * Generate complete Fleet environment
   */
  async generate(): Promise<void> {
    const specJson = JSON.stringify(this.specification, null, 2);

    const initialPrompt = `Generate a complete Fleet-compliant environment from this specification:

${specJson}

## Output Directory Structure:
\`\`\`
output/
├── data/
│   ├── seed.db
│   └── schema.sql
├── src/
│   ├── index.ts
│   ├── database.ts
│   ├── config.ts
│   └── routes/
│       └── *.ts
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
\`\`\`

Start by creating the database schema, then the seed data, then the server code.

Be thorough and implement actual business logic based on the specification.`;

    await this.run(initialPrompt);
  }
}
