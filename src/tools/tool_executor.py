"""
Tool executor - executes tools called by the agent
"""

import requests
from typing import Dict, Any
from urllib.parse import urljoin


class ToolExecutor:
    """Executes tools for agents"""

    def __init__(self, target_url: str):
        self.target_url = target_url
        self.observations = []

    def execute(self, tool_name: str, tool_input: Dict[str, Any]) -> Any:
        """Execute a tool by name"""
        if tool_name == "make_http_request":
            return self._make_http_request(tool_input)
        elif tool_name == "record_observation":
            return self._record_observation(tool_input)
        elif tool_name == "complete_exploration":
            return self._complete_exploration(tool_input)
        else:
            raise ValueError(f"Unknown tool: {tool_name}")

    def _make_http_request(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Make HTTP request to target API"""
        method = params.get("method", "GET").upper()
        path = params.get("path", "/")
        headers = params.get("headers", {})
        body = params.get("body")

        url = urljoin(self.target_url, path)

        try:
            if method == "GET":
                response = requests.get(url, headers=headers, timeout=10)
            elif method == "POST":
                response = requests.post(url, headers=headers, json=body, timeout=10)
            elif method == "PUT":
                response = requests.put(url, headers=headers, json=body, timeout=10)
            elif method == "DELETE":
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return {"success": False, "error": f"Unsupported method: {method}"}

            # Parse response
            try:
                response_body = response.json()
            except:
                response_body = response.text

            return {
                "success": True,
                "status": response.status_code,
                "statusText": response.reason,
                "headers": dict(response.headers),
                "body": response_body
            }

        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "error": str(e)
            }

    def _record_observation(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Record an observation about the API"""
        observation = params.get("observation", "")
        category = params.get("category", "general")

        self.observations.append({
            "category": category,
            "observation": observation
        })

        return {
            "success": True,
            "message": "Observation recorded"
        }

    def _complete_exploration(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Signal that exploration is complete"""
        summary = params.get("summary", "")

        return {
            "complete": True,
            "summary": summary,
            "observations": self.observations
        }
