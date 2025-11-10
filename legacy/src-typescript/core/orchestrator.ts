/**
 * Main Orchestrator
 * Coordinates all agents to clone an API
 */

import { LLMClient } from './llm-client.js';
import { ExplorationAgent } from '../agents/exploration-agent.js';
import { SpecificationAgent } from '../agents/specification-agent.js';
import { CodeGeneratorAgent } from '../agents/code-generator-agent.js';
import type { ToolExecutionContext } from '../tools/tool-executor.js';

export interface OrchestratorConfig {
  apiKey: string;
  targetUrl: string;
  outputDir: string;
  model?: string;
}

export interface CloneResult {
  success: boolean;
  outputDir: string;
  specificationFile?: string;
  error?: string;
}

export class Orchestrator {
  private config: OrchestratorConfig;
  private llm: LLMClient;

  constructor(config: OrchestratorConfig) {
    this.config = config;
    this.llm = new LLMClient({
      apiKey: config.apiKey,
      model: config.model || 'claude-sonnet-4-20250514'
    });
  }

  /**
   * Main cloning pipeline
   */
  async clone(): Promise<CloneResult> {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║              🤖 env-code-agent - Agentic System             ║
║                                                              ║
║  Autonomous API cloning with LLM-powered exploration        ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

📍 Target: ${this.config.targetUrl}
📁 Output: ${this.config.outputDir}
🧠 Model: ${this.config.model || 'claude-sonnet-4-20250514'}
`);

    try {
      // Step 1: Exploration
      console.log(`\n${'='.repeat(70)}`);
      console.log(`🔍 PHASE 1: AUTONOMOUS API EXPLORATION`);
      console.log('='.repeat(70));

      const context: ToolExecutionContext = {
        targetUrl: this.config.targetUrl,
        outputDir: this.config.outputDir
      };

      const explorationAgent = new ExplorationAgent(this.llm, context);
      const explorationResult = await explorationAgent.explore();

      // Get the full conversation as exploration summary
      const explorationMessages = explorationAgent.getMessages();
      const explorationSummary = explorationMessages
        .map(m => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n\n');

      console.log(`\n✅ Exploration complete!`);

      // Step 2: Specification Generation
      console.log(`\n${'='.repeat(70)}`);
      console.log(`📋 PHASE 2: SPECIFICATION GENERATION`);
      console.log('='.repeat(70));

      const specAgent = new SpecificationAgent(this.llm);
      const specification = await specAgent.buildSpecification(explorationSummary);

      console.log(`\n✅ Specification generated!`);

      // Step 3: Code Generation
      console.log(`\n${'='.repeat(70)}`);
      console.log(`⚡ PHASE 3: FLEET ENVIRONMENT GENERATION`);
      console.log('='.repeat(70));

      const codeGenAgent = new CodeGeneratorAgent(this.llm, context, specification);
      await codeGenAgent.generate();

      console.log(`\n✅ Code generation complete!`);

      // Success!
      console.log(`\n${'='.repeat(70)}`);
      console.log(`🎉 CLONING COMPLETE!`);
      console.log('='.repeat(70));

      console.log(`
📦 Your Fleet environment is ready at: ${this.config.outputDir}

📝 Next steps:
   1. cd ${this.config.outputDir}
   2. pnpm install
   3. pnpm dev
   4. Test your cloned API!

💡 The environment is Fleet-compliant and ready for deployment.
`);

      return {
        success: true,
        outputDir: this.config.outputDir
      };

    } catch (error: any) {
      console.error(`\n❌ Error during cloning:`, error.message);
      return {
        success: false,
        outputDir: this.config.outputDir,
        error: error.message
      };
    }
  }
}
