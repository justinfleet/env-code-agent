#!/usr/bin/env node
/**
 * CLI for env-code-agent
 * Main entry point for the API cloning system
 */

import { EndpointDiscovery } from './explorer/endpoint-discovery.js';
import { RequestExecutor } from './explorer/request-executor.js';
import { SchemaInference } from './schema/infer-schema.js';
import { SeedGenerator } from './schema/generate-seed.js';
import { ServerGenerator } from './generator/server-generator.js';
import { join } from 'path';
import type { CloneConfig } from './types.js';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printHelp();
    process.exit(0);
  }

  const command = args[0];

  if (command === 'clone') {
    await runClone(args.slice(1));
  } else if (command === 'test') {
    await runTest();
  } else {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
  }
}

async function runClone(args: string[]) {
  const targetUrl = args[0];

  if (!targetUrl) {
    console.error('Error: Target URL is required');
    console.log('Usage: env-clone clone <url> [options]');
    process.exit(1);
  }

  const config: CloneConfig = {
    targetUrl,
    outputDir: './output/cloned-env',
    validate: args.includes('--validate')
  };

  console.log(`\n🤖 env-code-agent - API Cloning System\n`);
  console.log(`Target: ${config.targetUrl}`);
  console.log(`Output: ${config.outputDir}\n`);

  try {
    // Step 1: Discover endpoints
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📡 STEP 1: Endpoint Discovery');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const discovery = new EndpointDiscovery(config.targetUrl);
    const explorationResult = await discovery.discoverEndpoints();

    if (explorationResult.endpoints.length === 0) {
      console.error('\n❌ No endpoints discovered. The API might be down or requires authentication.');
      process.exit(1);
    }

    console.log(`\nDiscovered endpoints:`);
    for (const endpoint of explorationResult.endpoints) {
      console.log(`  • ${endpoint.method} ${endpoint.path}`);
    }

    // Step 2: Gather examples
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 STEP 2: Gathering Request Examples');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const executor = new RequestExecutor(config.targetUrl);
    const examples = await executor.gatherExamples(explorationResult.endpoints);

    // Step 3: Infer schema
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔬 STEP 3: Inferring Database Schema');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const inference = new SchemaInference();
    const schema = inference.inferSchema(examples);

    console.log(`\nInferred tables:`);
    for (const table of schema.tables) {
      console.log(`  • ${table.name} (${table.fields.length} fields, ${table.data.length} rows)`);
    }

    // Step 4: Generate seed database
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📦 STEP 4: Generating Seed Database');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const seedGenerator = new SeedGenerator();
    const seedDbPath = join(config.outputDir, 'data/seed.db');
    const schemaPath = join(config.outputDir, 'data/schema.sql');

    seedGenerator.generateSeed(schema, seedDbPath);
    await seedGenerator.generateSchemaSQL(schema, schemaPath);

    // Step 5: Generate server code
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🏗️  STEP 5: Generating Server Code');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const serverGenerator = new ServerGenerator(config.outputDir);
    const result = await serverGenerator.generate(
      explorationResult.endpoints,
      examples,
      schema
    );

    // Success summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ CLONING COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`📊 Summary:`);
    console.log(`  • Endpoints cloned: ${result.endpoints.length}`);
    console.log(`  • Tables created: ${result.schema.tables.length}`);
    console.log(`  • Files generated: ${result.filesGenerated.length}`);
    console.log(`  • Output directory: ${result.outputPath}`);

    console.log(`\n📝 Next steps:`);
    console.log(`  1. cd ${config.outputDir}`);
    console.log(`  2. pnpm install`);
    console.log(`  3. pnpm dev`);
    console.log(`  4. Test the cloned API at http://localhost:3000`);

    console.log(`\n💡 The generated server currently returns mock data.`);
    console.log(`   Implement actual database queries in src/routes/*.ts\n`);

  } catch (error) {
    console.error('\n❌ Error during cloning:', error);
    process.exit(1);
  }
}

async function runTest() {
  console.log('🧪 Running test clone on famazon API...\n');

  // Test on local famazon instance
  await runClone(['http://localhost:3000', '--validate']);
}

function printHelp() {
  console.log(`
env-code-agent - Automated API Cloning System

USAGE:
  env-clone clone <url> [options]   Clone an API
  env-clone test                     Test on local famazon API
  env-clone --help                   Show this help

OPTIONS:
  --validate         Run validation after generation
  --output, -o DIR   Output directory (default: ./output/cloned-env)

EXAMPLES:
  env-clone clone http://localhost:3000
  env-clone clone https://api.example.com --validate
  env-clone test
`);
}

main().catch(console.error);
