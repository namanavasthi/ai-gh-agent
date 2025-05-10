import { createAgent, createActionsFromMcpConfig } from "spinai";
import { openai } from "@ai-sdk/openai";
// @ts-ignore
import mcpConfig from "../mcp-config.ts";
import { analyzeCodeChanges } from "./actions/analyze-code-changes.js";
import { createReviewComments } from "./actions/create-review-comments.js";
import { getFileBeforeAfter } from "./actions/get-file-before-after.js";
import { getPrFiles } from "./actions/get-pr-info.js";

/**
 * Create a GitHub PR review agent
 */
async function createPRReviewAgent() {
  console.log("Setting up PR review agent...");

  // Include only the specific GitHub actions needed for PR reviews
  const mcpActions = await createActionsFromMcpConfig({
    config: mcpConfig,
    includedActions: [
      "add_issue_comment", // Comment on the PR
    ],
    envMapping: {
      GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN,
    },
  });

  return createAgent({
    instructions: `You are a GitHub assistant that can help with repository management.
    Use the available GitHub actions to help users with their requests.`,
    actions: [
      ...mcpActions,
      analyzeCodeChanges,
      createReviewComments,
      getFileBeforeAfter,
      getPrFiles,
    ],
    model: openai("gpt-4o"),
    spinApiKey: process.env.SPINAI_API_KEY,
    agentId: "github-pr-review-agent",
  });
}

/**
 * Initialize the agent on module load
 */
let agentPromise: ReturnType<typeof createPRReviewAgent> | null = null;

/**
 * Get the PR review agent (creates it if it doesn't exist yet)
 */
export async function getPRReviewAgent() {
  if (!agentPromise) {
    agentPromise = createPRReviewAgent();
  }
  return agentPromise;
}

// Export the original creation function for testing/mocking
export { createPRReviewAgent };
