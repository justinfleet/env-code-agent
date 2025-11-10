"""
Tool definitions for the exploration agent
"""

EXPLORATION_TOOLS = [
    {
        "name": "make_http_request",
        "description": "Make an HTTP request to the target API to explore endpoints. Use this to discover what endpoints exist and how they behave.",
        "input_schema": {
            "type": "object",
            "properties": {
                "method": {
                    "type": "string",
                    "enum": ["GET", "POST", "PUT", "DELETE", "PATCH"],
                    "description": "HTTP method to use"
                },
                "path": {
                    "type": "string",
                    "description": "API path (e.g., '/api/books' or '/health')"
                },
                "headers": {
                    "type": "object",
                    "description": "Optional HTTP headers",
                    "additionalProperties": {"type": "string"}
                },
                "body": {
                    "type": "object",
                    "description": "Optional request body for POST/PUT requests"
                }
            },
            "required": ["method", "path"]
        }
    },
    {
        "name": "record_observation",
        "description": "Record an observation or insight about the API structure, data models, or behavior. Use this to document what you learn.",
        "input_schema": {
            "type": "object",
            "properties": {
                "observation": {
                    "type": "string",
                    "description": "The observation or insight you want to record"
                },
                "category": {
                    "type": "string",
                    "enum": ["endpoint", "data_model", "relationship", "validation", "authentication", "general"],
                    "description": "Category of the observation"
                }
            },
            "required": ["observation", "category"]
        }
    },
    {
        "name": "complete_exploration",
        "description": "Signal that you have completed exploring the API and have gathered enough information. Use this when you feel you have a thorough understanding of the API.",
        "input_schema": {
            "type": "object",
            "properties": {
                "summary": {
                    "type": "string",
                    "description": "A brief summary of what you discovered about the API"
                }
            },
            "required": ["summary"]
        }
    }
]
