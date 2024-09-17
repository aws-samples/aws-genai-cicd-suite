import express from 'express';
import { Octokit } from '@octokit/rest';
import { WebhookEvent } from '@octokit/webhooks-types';
import { handleReviewComment, handlePullRequest, handleIssueComment } from './handler'

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;
const octokit = new Octokit({ auth: process.env.GITHUB_APP_TOKEN });
console.log("GitHub App Token is set:", !!process.env.GITHUB_APP_TOKEN);

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