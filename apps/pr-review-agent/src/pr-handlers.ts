/**
 * PR and comment handling logic
 */
import { getPRReviewAgent } from "./github-agent";
import { CodeReviewSchema, CommentResponseSchema } from "./schemas";

// Unique marker for bot-generated comments
const BOT_COMMENT_MARKER = "🤖 ";

/**
 * Handle new pull request events
 */
export async function handleNewPullRequest(payload: any) {
  const { repository, pull_request } = payload;
  const owner = repository.owner.login;
  const repo = repository.name;
  const pullNumber = pull_request.number;

  console.log(`Reviewing PR #${pullNumber} in ${owner}/${repo}`);

  try {
    // Get the PR review agent
    const agent = await getPRReviewAgent();

    // Single agent call to analyze PR and create a proper review with line comments
    await agent({
      input: `Review pull request #${pullNumber} in repo ${owner}/${repo} by leaving comments on specific files in the pr.
      
      After, create an overview of the overall issue (PR) with what you've done..`,
      responseFormat: CodeReviewSchema,
    });

    console.log(`Review with line comments completed for PR #${pullNumber}`);
    return true;
  } catch (error) {
    console.log(`Error reviewing PR #${pullNumber}:`, error);
    return false;
  }
}

/**
 * Handle issue comments (comments on a PR)
 */
export async function handleIssueComment(payload: any) {
  const { repository, issue, comment } = payload;

  // Only respond to comments on PRs, not regular issues
  if (!issue.pull_request) {
    return false;
  }

  // Check if we should respond to this comment
  if (!shouldRespondToComment(comment.body)) {
    return false;
  }

  const owner = repository.owner.login;
  const repo = repository.name;
  const prNumber = issue.number;

  console.log(`Responding to comment on PR #${prNumber}`);

  try {
    // Get the PR review agent
    const agent = await getPRReviewAgent();

    // Single agent call to generate and post the response
    await agent({
      input: `Respond to this comment on PR #${prNumber} in ${owner}/${repo}:
              
              Comment: ${comment.body}
              Comment Author: ${comment.user.login}
              
              1. Generate a brief, helpful response that addresses the comment directly
              2. Post your response as a comment on the PR
              3. Be concise and focused on addressing the specific points in the comment
              
              IMPORTANT: Your comment MUST start with this exact emoji: ${BOT_COMMENT_MARKER}`,
      responseFormat: CommentResponseSchema,
    });

    console.log(`Response generated and posted to comment on PR #${prNumber}`);
    return true;
  } catch (error) {
    console.log(`Error responding to comment on PR #${prNumber}:`, error);
    return false;
  }
}

/**
 * Handle PR review comments (comments on specific lines)
 */
export async function handleReviewComment(payload: any) {
  const { repository, pull_request, comment } = payload;

  // Check if we should respond to this comment
  if (!shouldRespondToComment(comment.body)) {
    return false;
  }

  const owner = repository.owner.login;
  const repo = repository.name;
  const prNumber = pull_request.number;
  const filePath = comment.path;
  const linePosition = comment.position || "N/A";

  console.log(`Responding to review comment on file ${filePath}`);

  try {
    // Get the PR review agent
    const agent = await getPRReviewAgent();

    // Single agent call to handle everything
    await agent({
      input: `Respond to this code review comment on PR #${prNumber} in ${owner}/${repo}:
              
              Comment: ${comment.body}
              Comment Author: ${comment.user.login}
              File: ${filePath}
              Line: ${linePosition}
              
              Follow these steps:
              1. Get the content of the file focusing on the relevant code
              2. Generate a brief, technical response addressing the comment
              3. Include code examples if appropriate
              4. Post your response as a comment on this PR
              
              IMPORTANT: Your comment MUST start with this exact emoji: ${BOT_COMMENT_MARKER}
              
              Your response should be concise, helpful, and address the specific points in the comment.`,
      responseFormat: CommentResponseSchema,
    });

    console.log(`Response generated and posted to review comment`);
    return true;
  } catch (error) {
    console.log(`Error responding to review comment:`, error);
    return false;
  }
}

/**
 * Check if the bot should respond to a comment
 */
function shouldRespondToComment(commentBody: string): boolean {
  // Don't respond to our own comments (marked with the robot emoji)
  if (commentBody.trim().startsWith(BOT_COMMENT_MARKER)) {
    return false;
  }

  // Get bot username from environment variable or use default
  const botName = process.env.BOT_USERNAME || "github-bot";

  // Look for mentions or keywords that should trigger a response
  const triggers = [
    `@${botName}`,
    "bot",
    "ai",
    "review",
    "help",
    "explain",
    "what do you think",
    "can you suggest",
  ];

  const lowerComment = commentBody.toLowerCase();
  return triggers.some((trigger) =>
    lowerComment.includes(trigger.toLowerCase())
  );
}
