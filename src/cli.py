#!/usr/bin/env python3
"""
CLI for env-code-agent - API exploration and Fleet environment generation
"""

import os
import sys
import argparse
import shutil
from dotenv import load_dotenv

from .core.llm_client import LLMClient
from .agents.exploration_agent import ExplorationAgent
from .agents.specification_agent import SpecificationAgent
from .agents.code_generator_agent import CodeGeneratorAgent


def main():
    """Main CLI entry point"""
    load_dotenv()

    parser = argparse.ArgumentParser(
        description="Explore APIs and generate Fleet environments"
    )
    parser.add_argument(
        "command",
        choices=["clone", "explore"],
        help="Command to run"
    )
    parser.add_argument(
        "target_url",
        help="Target API URL (e.g., http://localhost:3001)"
    )
    parser.add_argument(
        "--output",
        "-o",
        help="Output directory for generated code",
        default="./output"
    )
    parser.add_argument(
        "--endpoints",
        "-e",
        nargs="+",
        help="List of endpoints to explore (e.g., /api/products /api/users)",
        default=None
    )
    parser.add_argument(
        "--max-iterations",
        "-m",
        type=int,
        help="Maximum number of exploration iterations (default: 100)",
        default=100
    )
    parser.add_argument(
        "--port",
        "-p",
        type=int,
        help="Port for the generated environment to run on (default: 3002)",
        default=3002
    )

    args = parser.parse_args()

    # Get API key
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        print("❌ Error: ANTHROPIC_API_KEY environment variable not set")
        sys.exit(1)

    # Initialize LLM client
    llm = LLMClient(api_key=api_key)

    # ========================================
    # PHASE 1: EXPLORATION
    # ========================================
    print(f"\n{'='*70}")
    print(f"🔍 PHASE 1: AUTONOMOUS API EXPLORATION")
    print(f"{'='*70}\n")

    if args.endpoints:
        print(f"📍 Starting endpoints: {', '.join(args.endpoints)}")
    print(f"🔄 Max iterations: {args.max_iterations}\n")

    exploration_agent = ExplorationAgent(
        llm,
        args.target_url,
        max_iterations=args.max_iterations
    )
    exploration_result = exploration_agent.explore(starting_endpoints=args.endpoints)

    print(f"\n{'='*70}")
    print(f"📊 EXPLORATION RESULTS")
    print(f"{'='*70}\n")

    print(f"✅ Success: {exploration_result['success']}")
    print(f"🔄 Iterations: {exploration_result['iterations']}")
    print(f"\n📝 Summary:\n{exploration_result['summary']}\n")

    if exploration_result['observations']:
        print(f"📋 Observations ({len(exploration_result['observations'])}):")
        for i, obs in enumerate(exploration_result['observations'], 1):
            print(f"  {i}. [{obs['category']}] {obs['observation']}")

    # If just exploring, stop here
    if args.command == "explore":
        print()
        return

    # ========================================
    # PHASE 2: SPECIFICATION GENERATION
    # ========================================
    print(f"\n{'='*70}")
    print(f"📋 PHASE 2: SPECIFICATION GENERATION")
    print(f"{'='*70}\n")

    spec_agent = SpecificationAgent(llm)
    spec_result = spec_agent.generate_spec(
        observations=exploration_result['observations'],
        target_url=args.target_url
    )

    if not spec_result['success']:
        print("❌ Failed to generate specification")
        sys.exit(1)

    print("✅ Specification generated successfully!")
    spec = spec_result['specification']
    print(f"   Endpoints: {len(spec.get('endpoints', []))}")
    print(f"   Tables: {len(spec.get('database', {}).get('tables', []))}")

    # ========================================
    # PHASE 3: CODE GENERATION
    # ========================================
    print(f"\n{'='*70}")
    print(f"⚡ PHASE 3: FLEET ENVIRONMENT GENERATION")
    print(f"{'='*70}\n")

    # Clean and create output directory
    output_dir = os.path.join(args.output, "cloned-env")

    # Remove existing directory if it exists
    if os.path.exists(output_dir):
        print(f"🧹 Cleaning existing output directory: {output_dir}")
        try:
            shutil.rmtree(output_dir)
            print(f"   ✓ Old files removed\n")
        except Exception as e:
            print(f"   ⚠️  Warning: Could not fully clean directory: {e}\n")

    # Create fresh output directory
    os.makedirs(output_dir, exist_ok=True)
    print(f"📁 Output directory: {output_dir}")
    print(f"🔌 Generated environment will run on port: {args.port}\n")

    code_agent = CodeGeneratorAgent(llm, output_dir, port=args.port)
    code_result = code_agent.generate_code(specification=spec)

    if not code_result['success']:
        print("❌ Failed to generate code")
        sys.exit(1)

    print(f"\n✅ Code generation complete!")
    print(f"   Generated {len(code_result['generated_files'])} files:")
    for file in code_result['generated_files']:
        print(f"   - {file}")

    # ========================================
    # COMPLETE
    # ========================================
    print(f"\n{'='*70}")
    print(f"🎉 CLONING COMPLETE!")
    print(f"{'='*70}\n")
    print(f"📂 Fleet environment created at: {output_dir}")
    print(f"✅ Environment validated and working!")
    print(f"\n📝 To run the generated environment:")
    print(f"   cd {output_dir}")
    print(f"   pnpm run dev")
    print(f"\n🔌 The API will be available at: http://localhost:{args.port}")
    print(f"\n💡 The environment follows Fleet standards:")
    print(f"   - Uses current.sqlite (auto-copied from seed.db)")
    print(f"   - Supports DATABASE_PATH/ENV_DB_DIR environment variables")
    print(f"   - Includes MCP server for LLM interaction")
    print(f"   - Runs with mprocs for multi-process development")
    print()


if __name__ == "__main__":
    main()
