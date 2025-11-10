"""
Specification Agent - synthesizes exploration findings into structured spec
"""

from ..core.base_agent import BaseAgent
from ..core.llm_client import LLMClient
from typing import List, Dict, Any
import json


SPECIFICATION_SYSTEM_PROMPT = """You are an expert API architect. Your job is to synthesize exploration findings into a complete, structured specification.

## Your Task:
Review the observations from API exploration and create a comprehensive specification that includes:

1. **Endpoints**: All discovered endpoints with their methods, paths, parameters, and behavior
2. **Data Models**: Complete data structures with field names and types
3. **Database Schema**: SQLite table definitions with proper types and relationships
4. **Business Logic**: How endpoints process data and interact with the database
5. **Validation Rules**: Any input validation or constraints discovered

## Output Format:
You must output valid JSON with this structure:
{
  "api_name": "string",
  "base_path": "string",
  "endpoints": [
    {
      "method": "GET|POST|PUT|DELETE",
      "path": "/api/resource",
      "description": "What this endpoint does",
      "query_params": ["param1", "param2"],
      "request_body": {...},
      "response": {...},
      "logic": "How it works (e.g., 'Returns all books from database', 'Filters by author parameter')"
    }
  ],
  "database": {
    "tables": [
      {
        "name": "table_name",
        "fields": [
          {"name": "id", "type": "INTEGER", "constraints": "PRIMARY KEY AUTOINCREMENT"},
          {"name": "field", "type": "TEXT|INTEGER|REAL", "constraints": "NOT NULL"}
        ]
      }
    ]
  }
}

## Important:
- Use SQLite types: TEXT, INTEGER, REAL, BLOB
- PRIMARY KEY should use INTEGER AUTOINCREMENT
- Infer relationships from foreign keys (e.g., product_id → products.id)
- Be thorough - include all endpoints and data models found
"""


class SpecificationAgent(BaseAgent):
    """Agent that synthesizes exploration into structured specification"""

    def __init__(self, llm: LLMClient):
        # Define tools for specification generation
        tools = [
            {
                "name": "output_specification",
                "description": "Output the final API specification as JSON",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "specification": {
                            "type": "object",
                            "description": "Complete API specification including endpoints, data models, and database schema"
                        }
                    },
                    "required": ["specification"]
                }
            }
        ]

        super().__init__(
            llm=llm,
            tools=tools,
            tool_executor=self._execute_tool,
            system_prompt=SPECIFICATION_SYSTEM_PROMPT,
            max_iterations=10
        )
        self.specification = None

    def _execute_tool(self, tool_name: str, tool_input: Dict[str, Any]) -> Any:
        """Execute specification tools"""
        if tool_name == "output_specification":
            self.specification = tool_input.get("specification")
            return {
                "complete": True,
                "message": "Specification generated successfully"
            }
        else:
            raise ValueError(f"Unknown tool: {tool_name}")

    def generate_spec(self, observations: List[Dict[str, Any]], target_url: str) -> Dict[str, Any]:
        """
        Generate specification from exploration observations

        Args:
            observations: List of observations from exploration
            target_url: The target API URL that was explored

        Returns:
            Structured specification
        """
        # Format observations for the prompt
        obs_text = "\n".join([
            f"[{obs['category']}] {obs['observation']}"
            for obs in observations
        ])

        initial_prompt = f"""Based on the following API exploration observations, create a complete specification.

Target API: {target_url}

Observations:
{obs_text}

Please analyze these observations and create a comprehensive specification that includes:
1. All discovered endpoints with their full details
2. Complete data models with field types
3. Database schema (SQLite) with proper table definitions
4. The business logic for each endpoint

Use the output_specification tool to provide the final spec as JSON."""

        result = self.run(initial_prompt)

        if self.specification:
            return {
                "success": True,
                "specification": self.specification
            }
        else:
            return {
                "success": False,
                "error": "Failed to generate specification"
            }
