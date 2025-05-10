import { createAction } from "spinai";
import { Octokit } from "@octokit/rest";

interface FileChange {
  filename: string;
  before_content: string | null;
  after_content: string | null;
}

export const getFileBeforeAfter = createAction({
  id: "get_file_before_after",
  description:
    "Gets the before and after content of files changed in a GitHub Pull Request.",
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
    const { prUrl } = parameters as { prUrl: string };

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
      // First, get the PR details to get base and head SHAs
      const { data: pr } = await octokit.pulls.get({
        owner,
        repo,
        pull_number: parseInt(pullNumber),
      });

      // Get list of files changed in PR
      const { data: files } = await octokit.pulls.listFiles({
        owner,
        repo,
        pull_number: parseInt(pullNumber),
      });

      const fileChanges: FileChange[] = await Promise.all(
        files.map(async (file) => {
          let beforeContent: string | null = null;
          let afterContent: string | null = null;

          // Get content after changes (from head)
          if (file.status !== "removed") {
            try {
              const { data: headContent } = await octokit.repos.getContent({
                owner,
                repo,
                path: file.filename,
                ref: pr.head.sha,
              });

              if (
                "content" in headContent &&
                typeof headContent.content === "string"
              ) {
                afterContent = Buffer.from(
                  headContent.content,
                  "base64"
                ).toString();
              }
            } catch (error) {
              console.error(
                `Error fetching head content for ${file.filename}:`,
                error
              );
            }
          }

          // Get content before changes (from base)
          if (file.status !== "added") {
            try {
              const { data: baseContent } = await octokit.repos.getContent({
                owner,
                repo,
                path: file.filename,
                ref: pr.base.sha,
              });

              if (
                "content" in baseContent &&
                typeof baseContent.content === "string"
              ) {
                beforeContent = Buffer.from(
                  baseContent.content,
                  "base64"
                ).toString();
              }
            } catch (error) {
              console.error(
                `Error fetching base content for ${file.filename}:`,
                error
              );
            }
          }

          return {
            filename: file.filename,
            before_content: beforeContent,
            after_content: afterContent,
          };
        })
      );

      return fileChanges;
    } catch (error) {
      throw new Error(`Failed to fetch PR file contents: ${error}`);
    }
  },
});
