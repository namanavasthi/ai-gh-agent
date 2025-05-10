/**
 * Zod schemas for agent responses
 */
import { z } from "zod";

/**
 * Schema for code review analysis
 */
export const CodeReviewSchema = z.object({
  review: z.object({
    summary: z.string().describe("Overall assessment of the PR"),
    keyPoints: z.array(z.string()).describe("Key points about the PR"),
    commentCount: z.number().describe("Number of line comments added"),
  }),
  status: z
    .enum(["completed", "commented", "changes_requested", "approved"])
    .describe("Status of the review"),
});

/**
 * Schema for PR comment response
 * Used for both generating and posting comments
 */
export const CommentResponseSchema = z.object({
  response: z.string().describe("Response to the comment"),
});
