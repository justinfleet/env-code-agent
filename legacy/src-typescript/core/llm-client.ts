/**
 * LLM Client wrapper for Anthropic Claude
 */

import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, Tool } from '@anthropic-ai/sdk/resources/messages.mjs';

export interface LLMConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  toolCalls?: ToolCall[];
  stopReason: string;
}

export interface ToolCall {
  id: string;
  name: string;
  input: any;
}

export class LLMClient {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(config: LLMConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey
    });
    this.model = config.model || 'claude-sonnet-4-20250514';
    this.maxTokens = config.maxTokens || 4096;
    this.temperature = config.temperature || 1.0;
  }

  /**
   * Send a message to the LLM with optional tools
   */
  async complete(
    messages: LLMMessage[],
    tools?: Tool[],
    systemPrompt?: string
  ): Promise<LLMResponse> {
    const formattedMessages: MessageParam[] = messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    const params: any = {
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      messages: formattedMessages
    };

    if (systemPrompt) {
      params.system = systemPrompt;
    }

    if (tools && tools.length > 0) {
      params.tools = tools;
    }

    const response = await this.client.messages.create(params);

    // Parse response
    const toolCalls: ToolCall[] = [];
    let textContent = '';

    for (const block of response.content) {
      if (block.type === 'text') {
        textContent += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          input: block.input
        });
      }
    }

    return {
      content: textContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      stopReason: response.stop_reason || 'end_turn'
    };
  }

  /**
   * Continue conversation with tool results
   */
  async continueWithToolResults(
    messages: LLMMessage[],
    toolCalls: ToolCall[],
    toolResults: any[],
    tools: Tool[],
    systemPrompt?: string
  ): Promise<LLMResponse> {
    // Add assistant message with tool calls
    const assistantContent: any[] = toolCalls.map(tc => ({
      type: 'tool_use',
      id: tc.id,
      name: tc.name,
      input: tc.input
    }));

    // Add tool results
    const userContent: any[] = toolResults.map((result, idx) => ({
      type: 'tool_result',
      tool_use_id: toolCalls[idx].id,
      content: typeof result === 'string' ? result : JSON.stringify(result)
    }));

    const formattedMessages: MessageParam[] = [
      ...messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      })),
      {
        role: 'assistant' as const,
        content: assistantContent
      },
      {
        role: 'user' as const,
        content: userContent
      }
    ];

    const params: any = {
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      messages: formattedMessages,
      tools
    };

    if (systemPrompt) {
      params.system = systemPrompt;
    }

    const response = await this.client.messages.create(params);

    // Parse response
    const newToolCalls: ToolCall[] = [];
    let textContent = '';

    for (const block of response.content) {
      if (block.type === 'text') {
        textContent += block.text;
      } else if (block.type === 'tool_use') {
        newToolCalls.push({
          id: block.id,
          name: block.name,
          input: block.input
        });
      }
    }

    return {
      content: textContent,
      toolCalls: newToolCalls.length > 0 ? newToolCalls : undefined,
      stopReason: response.stop_reason || 'end_turn'
    };
  }
}
