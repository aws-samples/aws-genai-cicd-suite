import express from 'express';
import { Octokit } from '@octokit/rest';
import { WebhookEvent } from '@octokit/webhooks-types';
import { handleReviewComment, handlePullRequest, handleIssueComment } from './handler'

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;

// Check if GITHUB_APP_TOKEN is set
if (!process.env.GITHUB_APP_TOKEN) {
  console.error("Error: GITHUB_APP_TOKEN environment variable is not set");
  process.exit(1);
}

const octokit = new Octokit({ auth: process.env.GITHUB_APP_TOKEN });
console.log("GitHub App Token is set:", !!process.env.GITHUB_APP_TOKEN);

/*
Review comments: Directly reply to a review comment made by IBT Bot. Example:
-- I pushed a fix in commit <commit_id>, please review it.
-- Generate unit testing code for this file.
Open a follow-up GitHub issue for this discussion.
Files and specific lines of code (under the "Files changed" tab): Tag @IBTBot in a new review comment at the desired location with your query. Examples:
-- @IBTBot generate unit testing code for this file.
-- @IBTBot modularize this function.
PR comments: Tag @IBTBot in a new PR comment to ask questions about the PR branch. For the best results, please provide a very specific query, as very limited context is provided in this mode. Examples:
-- @IBTBot gather interesting stats about this repository and render them as a table. Additionally, render a pie chart showing the language distribution in the codebase.
-- @IBTBot read src/utils.ts and generate unit testing code.
-- @IBTBot read the files in the src/scheduler package and generate a class diagram using mermaid and a README in the markdown format.
-- @IBTBot help me debug IBT Bot configuration file, not for now.
*/
app.post('/webhook', async (req, res) => {
  const event = req.body as WebhookEvent;
  const githubEvent = req.headers["x-github-event"] as string;
  console.log('githubEvent received: ', githubEvent)
  try {
    switch (githubEvent) {
      case "pull_request_review_comment":
        await handleReviewComment(event, octokit);
        break;
      case "pull_request":
        if ('action' in event) {
          if (event.action === "opened" || event.action === "synchronize") {
            await handlePullRequest(event, octokit);
          }
        }
        break;
      // Note a new comment in PR will trigger the issue comment event
      case "issue_comment":
        if ('action' in event && (event.action === "created" || event.action === "edited")) {
          await handleIssueComment(event, octokit);
        }
        break;
      default:
        console.log(`Unhandled event type: ${githubEvent}`);
    }
    res.status(200).send("OK");
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
