"""
Exploration Agent - autonomously explores an API
"""

from ..core.base_agent import BaseAgent
from ..core.llm_client import LLMClient
from ..tools.tool_executor import ToolExecutor
from ..tools.tool_definitions import EXPLORATION_TOOLS


EXPLORATION_SYSTEM_PROMPT = """You are an expert API explorer. Your job is to autonomously explore an API to understand its complete structure and behavior.

## Your Goals:
1. Discover all available endpoints (GET, POST, PUT, DELETE, etc.)
2. Understand the data models and relationships
3. Identify CRUD patterns and business logic
4. Map state-changing operations
5. Understand validation rules and error handling
6. Identify authentication/authorization requirements

## Your Approach:
- Start with common patterns: /health, /api, /api/v1, etc.
- When you find a collection endpoint (e.g., /api/products), look for single-item endpoints (e.g., /api/products/{id})
- Test pagination, filtering, sorting on list endpoints
- For POST endpoints, try valid and invalid data to understand validation
- Look for relationships (e.g., products → categories, orders → items)
- Pay attention to response structures and infer database schema
- Note any authentication headers or tokens required

## Available Tools:
- make_http_request: Make HTTP requests to explore endpoints
- record_observation: Document your findings
- complete_exploration: Signal when you've gathered enough information

## Strategy:
1. Start broad: Find main resource endpoints
2. Go deep: Explore each resource thoroughly
3. Find relationships: Look for foreign keys and nested resources
4. Test edge cases: Try invalid inputs, missing params, etc.
5. Document everything: Record observations as you go

Remember: Be systematic and thorough. The quality of your exploration determines how well we can clone this API."""


class ExplorationAgent(BaseAgent):
    """Agent that explores an API to understand its structure"""

    def __init__(self, llm: LLMClient, target_url: str):
        self.executor = ToolExecutor(target_url)

        super().__init__(
            llm=llm,
            tools=EXPLORATION_TOOLS,
            tool_executor=self.executor.execute,
            system_prompt=EXPLORATION_SYSTEM_PROMPT,
            max_iterations=100
        )

    def explore(self) -> dict:
        """
        Explore the target API

        Returns exploration results including endpoints, observations, etc.
        """
        initial_prompt = f"""Explore the API at {self.executor.target_url}.

Start by testing common endpoints like:
- /health or /api/health
- /api
- /api/v1
- Common resource patterns like /api/products, /api/users, /api/orders, /api/books

Be systematic:
1. First, discover what endpoints exist
2. Then, explore each endpoint in depth
3. Look for patterns and relationships
4. Document everything you learn

When you've thoroughly explored the API and feel you have a complete understanding, use the complete_exploration tool."""

        result = self.run(initial_prompt)

        # Extract exploration data from final result
        exploration_data = result.get("data", {})

        return {
            "success": result["success"],
            "iterations": result["iterations"],
            "summary": exploration_data.get("summary", ""),
            "observations": exploration_data.get("observations", [])
        }
