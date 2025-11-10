"""
LLM Client wrapper for Anthropic Claude
"""

from anthropic import Anthropic
from typing import List, Dict, Any, Optional


class LLMClient:
    """Simple wrapper around Anthropic API for agentic workflows"""

    def __init__(
        self,
        api_key: str,
        model: str = "claude-sonnet-4-20250514",
        max_tokens: int = 4096,
        temperature: float = 1.0
    ):
        self.client = Anthropic(api_key=api_key)
        self.model = model
        self.max_tokens = max_tokens
        self.temperature = temperature

    def create_message(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        system: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a message with optional tools
        Returns the raw Anthropic API response
        """
        params = {
            "model": self.model,
            "max_tokens": self.max_tokens,
            "temperature": self.temperature,
            "messages": messages
        }

        if system:
            params["system"] = system

        if tools:
            params["tools"] = tools

        response = self.client.messages.create(**params)
        return response
