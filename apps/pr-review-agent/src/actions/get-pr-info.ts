import { createAction } from "spinai";
import { Octokit } from "@octokit/rest";

export const getPrFiles = createAction({
  id: "getPrFiles",
  description: "Gets the list of files changed in a GitHub Pull Request.",
  parameters: {
    type: "object",
    properties: {
      prUrl: {
        type: "string",
        description:
          "Full URL of the GitHub PR (e.g., https://github.com/owner/repo/pull/number)",
      },
    },
    required: ["prUrl"],
  },
  async run({ parameters }) {
    const { prUrl } = parameters || {};
    if (!prUrl || typeof prUrl !== "string") {
      throw new Error(
        `Missing required parameter: prUrl / wrong format ${prUrl}`
      );
    }

    // Parse PR URL to get owner, repo, and PR number
    const prUrlRegex = /github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/;
    const match = prUrl.match(prUrlRegex);

    if (!match) {
      throw new Error("Invalid GitHub PR URL format");
    }

    const [, owner, repo, pullNumber] = match;

    // Initialize Octokit with the token from environment
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    try {
      // Get PR files
      const { data: files } = await octokit.pulls.listFiles({
        owner,
        repo,
        pull_number: parseInt(pullNumber),
      });

      // Transform the response to a more readable format
      return files.map((file) => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        patch: file.patch,
      }));
    } catch (error) {
      throw new Error(`Failed to fetch PR files: ${error}`);
    }
  },
});
