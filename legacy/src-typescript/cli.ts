#!/usr/bin/env node
/**
 * CLI for env-code-agent
 * Agentic API cloning system
 */

import { config as loadEnv } from 'dotenv';
import { Orchestrator } from './core/orchestrator.js';

loadEnv();

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printHelp();
    process.exit(0);
  }

  const command = args[0];

  if (command === 'clone') {
    await runClone(args.slice(1));
  } else {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
  }
}

async function runClone(args: string[]) {
  const targetUrl = args[0];

  if (!targetUrl) {
    console.error('❌ Error: Target URL is required');
    console.log('Usage: env-code-agent clone <url>');
    process.exit(1);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: ANTHROPIC_API_KEY environment variable is required');
    console.log('Set it in .env file or export ANTHROPIC_API_KEY=your_key');
    process.exit(1);
  }

  const outputDir = process.env.OUTPUT_DIR || './output/cloned-env';
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

  const orchestrator = new Orchestrator({
    apiKey,
    targetUrl,
    outputDir,
    model
  });

  const result = await orchestrator.clone();

  if (!result.success) {
    console.error(`\n❌ Cloning failed: ${result.error}`);
    process.exit(1);
  }

  process.exit(0);
}

function printHelp() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║          env-code-agent - Agentic API Cloning System        ║
╚══════════════════════════════════════════════════════════════╝

DESCRIPTION:
  Autonomous system that explores APIs and generates Fleet-compliant
  environments using LLM-powered agents.

USAGE:
  env-code-agent clone <url>

ARGUMENTS:
  <url>     Target API URL to clone (e.g., http://localhost:3000)

ENVIRONMENT VARIABLES:
  ANTHROPIC_API_KEY    Required. Your Anthropic API key
  ANTHROPIC_MODEL      Optional. Model to use (default: claude-sonnet-4-20250514)
  OUTPUT_DIR           Optional. Output directory (default: ./output/cloned-env)

EXAMPLES:
  # Clone a local API
  env-code-agent clone http://localhost:3000

  # Clone with custom output directory
  OUTPUT_DIR=./my-clone env-code-agent clone http://localhost:3000

HOW IT WORKS:
  1. 🔍 Exploration Agent autonomously explores the target API
  2. 📋 Specification Agent synthesizes findings into structured spec
  3. ⚡ Code Generator Agent creates Fleet-compliant environment
  4. 🎉 Complete, runnable environment ready for deployment

REQUIREMENTS:
  - Node.js 20+
  - Anthropic API key
  - Target API running and accessible
`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
