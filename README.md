# env-code-agent

Automated API cloning system for generating Fleet-compliant environments.

## Overview

Given a running API, this tool:
1. **Explores** the API to discover endpoints
2. **Infers** database schema from responses
3. **Generates** a complete Fleet environment (Express server + SQLite + MCP)
4. **Validates** clone fidelity through differential testing

## Quick Start

```bash
# Install dependencies
pnpm install

# Clone an API
pnpm clone http://localhost:3000

# Output will be in ./output/cloned-env/
```

## Usage

```bash
# Clone a running API
tsx src/cli.ts clone <api-url> [options]

# Options:
#   --output, -o    Output directory (default: ./output/cloned-env)
#   --endpoints, -e Specific endpoints to clone (comma-separated)
#   --validate      Run validation after generation
```

## Architecture

```
src/
├── explorer/        # API discovery and probing
├── schema/          # Database schema inference
├── generator/       # Code generation
├── validator/       # Differential testing
└── cli.ts          # Command-line interface
```

## Example

```bash
# Clone the famazon API
tsx src/cli.ts clone http://localhost:3000 --validate

# Generated output:
# output/cloned-env/
# ├── server/
# │   ├── src/
# │   └── package.json
# ├── data/
# │   ├── seed.db
# │   └── schema.sql
# └── mcp-server/
```

## Fleet Compliance

Generated environments follow all Fleet standards:
- ✅ `seed.db` ready for immediate use as `current.sqlite`
- ✅ `schema.sql` without CHECK constraints
- ✅ INTEGER AUTOINCREMENT primary keys
- ✅ Backend-driven (no localStorage)
- ✅ Deterministic behavior
- ✅ MCP server wrapper
- ✅ Fast startup (<10s target)

## Development

```bash
# Watch mode
pnpm dev

# Build
pnpm build

# Test on famazon
pnpm clone http://localhost:3000
```

## License

MIT
