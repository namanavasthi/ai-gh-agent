import { createAction } from "spinai";
import { Octokit } from "@octokit/rest";

interface ReviewComment {
  line: number;
  comment: string;
}

interface CreateReviewCommentsParams {
  prUrl: string;
  filename: string;
  comments: ReviewComment[];
}

function isReviewComment(obj: unknown): obj is ReviewComment {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "line" in obj &&
    typeof (obj as ReviewComment).line === "number" &&
    "comment" in obj &&
    typeof (obj as ReviewComment).comment === "string"
  );
}

function validateParameters(
  params: Record<string, unknown>
): CreateReviewCommentsParams {
  if (
    typeof params.prUrl !== "string" ||
    typeof params.filename !== "string" ||
    !Array.isArray(params.comments) ||
    !params.comments.every(isReviewComment)
  ) {
    throw new Error(
      "Invalid parameters: prUrl, filename must be strings and comments must be an array of ReviewComments"
    );
  }

  return {
    prUrl: params.prUrl,
    filename: params.filename,
    comments: params.comments,
  };
}

export const createReviewComments = createAction({
  id: "create_review_comments",
  description: "Creates review comments on a GitHub Pull Request",
  parameters: {
    type: "object",
    properties: {
      prUrl: {
        type: "string",
        description:
          "Full URL of the GitHub PR (e.g., https://github.com/owner/repo/pull/number)",
      },
      filename: {
        type: "string",
        description: "Name of the file to comment on",
      },
      comments: {
        type: "array",
        items: {
          type: "object",
          properties: {
            line: { type: "number" },
            comment: { type: "string" },
          },
          required: ["line", "comment"],
        },
        description: "Array of comments with line numbers",
      },
    },
    required: ["prUrl", "filename", "comments"],
  },
  async run({ parameters }) {
    if (!parameters || typeof parameters !== "object") {
      throw new Error("Parameters are required");
    }

    const { prUrl, filename, comments } = validateParameters(parameters);

    // Parse PR URL to get owner, repo, and PR number
    const prUrlRegex = /github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/;
    const match = prUrl.match(prUrlRegex);

    if (!match) {
      throw new Error("Invalid GitHub PR URL format");
    }

    const [, owner, repo, pullNumber] = match;

    // Initialize Octokit
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    try {
      // Get the latest commit SHA from the PR
      const { data: pr } = await octokit.pulls.get({
        owner,
        repo,
        pull_number: parseInt(pullNumber),
      });

      const commitId = pr.head.sha;

      // Create a new review
      const review = await octokit.pulls.createReview({
        owner,
        repo,
        pull_number: parseInt(pullNumber),
        commit_id: commitId,
        event: "COMMENT",
        comments: comments.map((comment: ReviewComment) => ({
          path: filename,
          line: comment.line,
          body: comment.comment,
          side: "RIGHT",
        })),
      });

      return {
        reviewId: review.data.id,
        commentCount: comments.length,
      };
    } catch (error) {
      throw new Error(`Failed to create review comments: ${error}`);
    }
  },
});
