/**
 * Base Agent class with agentic loop
 */

import { LLMClient, type LLMMessage } from './llm-client.js';
import { ToolExecutor, type ToolExecutionContext } from '../tools/tool-executor.js';
import type { Tool } from '@anthropic-ai/sdk/resources/messages.mjs';

export interface AgentConfig {
  llm: LLMClient;
  tools: Tool[];
  systemPrompt: string;
  maxIterations?: number;
  context: ToolExecutionContext;
}

export interface AgentResult {
  success: boolean;
  iterations: number;
  finalMessage: string;
  data?: any;
}

export abstract class BaseAgent {
  protected llm: LLMClient;
  protected tools: Tool[];
  protected systemPrompt: string;
  protected maxIterations: number;
  protected executor: ToolExecutor;
  protected messages: LLMMessage[];

  constructor(config: AgentConfig) {
    this.llm = config.llm;
    this.tools = config.tools;
    this.systemPrompt = config.systemPrompt;
    this.maxIterations = config.maxIterations || 50;
    this.executor = new ToolExecutor(config.context);
    this.messages = [];
  }

  /**
   * Main agentic loop
   */
  async run(initialPrompt: string): Promise<AgentResult> {
    console.log(`\n🤖 Starting agent: ${this.constructor.name}`);
    console.log(`📋 Initial task: ${initialPrompt}\n`);

    // Add initial user message
    this.messages.push({
      role: 'user',
      content: initialPrompt
    });

    let iteration = 0;
    let isComplete = false;
    let finalData: any = null;

    while (iteration < this.maxIterations && !isComplete) {
      iteration++;
      console.log(`\n━━━ Iteration ${iteration}/${this.maxIterations} ━━━`);

      // Get LLM response
      const response = await this.llm.complete(
        this.messages,
        this.tools,
        this.systemPrompt
      );

      // Log LLM thinking
      if (response.content) {
        console.log(`💭 Agent: ${response.content.substring(0, 200)}${response.content.length > 200 ? '...' : ''}`);
      }

      // Check if agent wants to use tools
      if (response.toolCalls && response.toolCalls.length > 0) {
        // Execute tools
        const toolResults: any[] = [];

        for (const toolCall of response.toolCalls) {
          console.log(`🔧 Tool: ${toolCall.name}`);
          console.log(`   Input: ${JSON.stringify(toolCall.input).substring(0, 100)}...`);

          try {
            const result = await this.executor.execute(toolCall.name, toolCall.input);
            toolResults.push(result);

            // Check if this tool signals completion
            if (result.complete) {
              isComplete = true;
              finalData = result;
            }

            console.log(`   ✓ Result: ${JSON.stringify(result).substring(0, 100)}...`);
          } catch (error: any) {
            console.log(`   ✗ Error: ${error.message}`);
            toolResults.push({ error: error.message });
          }
        }

        // Add assistant message with initial thinking to history
        this.messages.push({
          role: 'assistant',
          content: response.content
        });

        // Add user message with tool results summary to history
        const toolSummary = response.toolCalls.map((tc, idx) => {
          const result = toolResults[idx];
          return `Tool ${tc.name} executed: ${JSON.stringify(result).substring(0, 200)}`;
        }).join('\n');

        this.messages.push({
          role: 'user',
          content: `[Tool Results]\n${toolSummary}`
        });

        // Continue conversation with tool results
        const nextResponse = await this.llm.continueWithToolResults(
          this.messages.slice(0, -2), // Use history before we added the summary
          response.toolCalls,
          toolResults,
          this.tools,
          this.systemPrompt
        );

        // Add the LLM's response after seeing tool results
        if (nextResponse.content) {
          this.messages.push({
            role: 'assistant',
            content: nextResponse.content
          });
        }

        // Check if we're done after processing tool results
        if (isComplete) {
          break;
        }

        // If agent has more to say or more tools to use
        if (nextResponse.toolCalls && nextResponse.toolCalls.length > 0) {
          // We have more tool calls - they'll be handled in the next iteration
          // The LLM will see the full conversation history including what just happened
          continue;
        } else if (nextResponse.stopReason === 'end_turn') {
          // Agent finished its turn
          break;
        }
      } else {
        // No tool calls, agent finished
        this.messages.push({
          role: 'assistant',
          content: response.content
        });
        break;
      }
    }

    const finalMessage = this.messages[this.messages.length - 1]?.content || '';

    console.log(`\n✅ Agent completed after ${iteration} iterations\n`);

    return {
      success: isComplete || iteration < this.maxIterations,
      iterations: iteration,
      finalMessage,
      data: finalData
    };
  }

  /**
   * Get conversation history
   */
  getMessages(): LLMMessage[] {
    return this.messages;
  }

  /**
   * Reset agent state
   */
  reset(): void {
    this.messages = [];
  }
}
