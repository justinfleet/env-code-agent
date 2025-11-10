"""
Code Generator Agent - generates Fleet-compliant environment from specification
"""

from ..core.base_agent import BaseAgent
from ..core.llm_client import LLMClient
from typing import Dict, Any
import os
import json


CODE_GENERATION_SYSTEM_PROMPT = """You are an expert full-stack developer specializing in Fleet environment creation.

## Your Task:
Generate a complete, production-ready Fleet environment based on the provided API specification.

## Fleet Requirements (CRITICAL):
1. **Database**:
   - SQLite with WAL mode enabled
   - INTEGER AUTOINCREMENT for primary keys
   - NO CHECK constraints (use validation in code)
   - Foreign keys enabled
   - seed.db ready for immediate use

2. **Server**:
   - Express + TypeScript
   - Proper error handling
   - CORS enabled
   - Real SQL queries (no mocks!)
   - Routes organized by resource

3. **File Structure**:
   ```
   cloned-env/
   ├── package.json
   ├── tsconfig.json
   ├── data/
   │   ├── schema.sql
   │   └── seed.db (generated from schema)
   ├── src/
   │   ├── index.ts (main server)
   │   ├── lib/
   │   │   └── db.ts (database connection)
   │   └── routes/
   │       └── [resource].ts (one file per resource)
   └── README.md
   ```

## Available Tools:
- write_file: Write content to a file in the output directory
- create_seed_database: Create seed.db from schema.sql
- complete_generation: Signal when all files are generated

## Code Style:
- Use TypeScript with proper types
- Use better-sqlite3 for database
- Proper error handling with try/catch
- RESTful endpoint design
- Consistent response format: { data: ..., error: ... }

## Steps:
1. Create package.json with all dependencies
2. Create tsconfig.json
3. Create data/schema.sql with proper SQLite schema
4. Create src/lib/db.ts for database connection
5. Create src/routes/[resource].ts for each resource
6. Create src/index.ts as main server
7. Create README.md with setup instructions
8. Create seed database from schema
9. Call complete_generation when done

Be thorough and ensure all files are production-ready!
"""


class CodeGeneratorAgent(BaseAgent):
    """Agent that generates Fleet environment code from specification"""

    def __init__(self, llm: LLMClient, output_dir: str):
        self.output_dir = output_dir
        self.generated_files = []

        # Define tools for code generation
        tools = [
            {
                "name": "write_file",
                "description": "Write content to a file in the output directory",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "path": {
                            "type": "string",
                            "description": "Relative path within output directory (e.g., 'src/index.ts')"
                        },
                        "content": {
                            "type": "string",
                            "description": "File content to write"
                        }
                    },
                    "required": ["path", "content"]
                }
            },
            {
                "name": "create_seed_database",
                "description": "Create seed.db from schema.sql file",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "schema_path": {
                            "type": "string",
                            "description": "Path to schema.sql file (relative to output dir)"
                        },
                        "output_path": {
                            "type": "string",
                            "description": "Path where seed.db should be created"
                        }
                    },
                    "required": ["schema_path", "output_path"]
                }
            },
            {
                "name": "complete_generation",
                "description": "Signal that code generation is complete",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "summary": {
                            "type": "string",
                            "description": "Summary of what was generated"
                        }
                    },
                    "required": ["summary"]
                }
            }
        ]

        super().__init__(
            llm=llm,
            tools=tools,
            tool_executor=self._execute_tool,
            system_prompt=CODE_GENERATION_SYSTEM_PROMPT,
            max_iterations=50
        )

    def _execute_tool(self, tool_name: str, tool_input: Dict[str, Any]) -> Any:
        """Execute code generation tools"""
        if tool_name == "write_file":
            return self._write_file(tool_input)
        elif tool_name == "create_seed_database":
            return self._create_seed_database(tool_input)
        elif tool_name == "complete_generation":
            return {
                "complete": True,
                "summary": tool_input.get("summary", ""),
                "generated_files": self.generated_files
            }
        else:
            raise ValueError(f"Unknown tool: {tool_name}")

    def _write_file(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Write a file to the output directory"""
        rel_path = params.get("path")
        content = params.get("content")

        # Create full path
        full_path = os.path.join(self.output_dir, rel_path)

        # Create directory if needed
        os.makedirs(os.path.dirname(full_path), exist_ok=True)

        # Write file
        with open(full_path, 'w') as f:
            f.write(content)

        self.generated_files.append(rel_path)

        return {
            "success": True,
            "message": f"File written: {rel_path}",
            "path": full_path
        }

    def _create_seed_database(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Create seed database from schema SQL"""
        import sqlite3

        schema_path = os.path.join(self.output_dir, params.get("schema_path"))
        output_path = os.path.join(self.output_dir, params.get("output_path"))

        # Read schema
        with open(schema_path, 'r') as f:
            schema_sql = f.read()

        # Create database directory if needed
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        # Create database
        conn = sqlite3.connect(output_path)

        # Enable WAL mode and foreign keys
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")

        # Execute schema
        conn.executescript(schema_sql)
        conn.commit()
        conn.close()

        return {
            "success": True,
            "message": f"Database created: {params.get('output_path')}"
        }

    def generate_code(self, specification: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate Fleet environment code from specification

        Args:
            specification: The API specification from SpecificationAgent

        Returns:
            Generation results including file list
        """
        # Format specification for the prompt
        spec_json = json.dumps(specification, indent=2)

        initial_prompt = f"""Generate a complete Fleet environment based on this specification:

{spec_json}

Create all necessary files following Fleet standards:
1. package.json with dependencies (express, better-sqlite3, cors, typescript, etc.)
2. tsconfig.json with proper settings
3. data/schema.sql with the database schema
4. src/lib/db.ts for database connection (WAL mode, foreign keys enabled)
5. src/routes/[resource].ts for each resource (books, etc.)
6. src/index.ts as the main Express server
7. README.md with setup and usage instructions
8. Create seed.db from the schema

Use the write_file tool for each file, then create_seed_database, then complete_generation.

Make sure all code is production-ready with proper error handling!"""

        result = self.run(initial_prompt)

        return {
            "success": result.get("success", False),
            "generated_files": self.generated_files,
            "output_dir": self.output_dir
        }
