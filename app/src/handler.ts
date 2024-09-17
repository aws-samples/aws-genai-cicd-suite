import { Octokit } from '@octokit/rest';
import { WebhookEvent } from '@octokit/webhooks-types';
import { generateUnitTestsPerFile, modularizeFunction, generateStats, findConsoleLogStatements, generateClassDiagram, debugBotConfig } from './utils';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const bedrockClient = new BedrockRuntimeClient({ region: 'us-east-1' });
const modelId = 'anthropic.claude-3-sonnet-20240229-v1:0'; // Replace with your desired model ID
const intentionPrompt = `
Task context: You are an AI assistant for a GitHub repository, designed to help users with various repository-related tasks.

Tone context: Maintain a helpful and professional tone, focusing on accurately classifying user queries.

Background data: You have access to repository statistics, code analysis tools, and configuration files.

Detailed task description & rules:
- Classify the user's query into one of the predefined categories.
- If the query doesn't fit any category, classify it as "Other (general query)".
- Consider the context of a GitHub repository when interpreting queries.
- Do not attempt to execute any actions; your task is solely classification.

Categories:
1. Generate repository stats
2. Show console.log statements
3. Generate unit tests
4. Generate class diagram and README
5. Debug IBTBot configuration
6. Other (general query)

Examples:
<example>
User: Can you show me some interesting stats about this repo?
Classification: Generate repository stats

User: I need to see all console.log statements in the codebase
Classification: Show console.log statements

User: Generate unit tests for the utils.ts file
Classification: Generate unit tests

User: Create a class diagram for the src folder and include a README
Classification: Generate class diagram and README

User: Help me debug the IBTBot config file
Classification: Debug IBTBot configuration

User: What's the best way to optimize this function?
Classification: Other (general query)
</example>

Immediate task description: Classify the following user query into one of the predefined categories.

User query: "{{USER_QUERY}}"

Think step by step:
1. Read the user query carefully.
2. Consider the context of a GitHub repository.
3. Compare the query to the predefined categories and examples.
4. Choose the most appropriate category.

Output formatting: Respond with only the category name, nothing else.

Classification:`;

export async function invokeModel(client: BedrockRuntimeClient, modelId: string, payloadInput: string): Promise<string> {
  try {
    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [{
            type: "text",
            text: payloadInput,
          }],
        },
      ],
    };

    const command = new InvokeModelCommand({
      // modelId: "anthropic.claude-3-sonnet-20240229-v1:0",
      modelId: modelId,
      contentType: "application/json",
      body: JSON.stringify(payload),
    });

    const apiResponse = await client.send(command);
    const decodedResponseBody = new TextDecoder().decode(apiResponse.body);
    const responseBody = JSON.parse(decodedResponseBody);
    const finalResult = responseBody.content[0].text;

    return finalResult;
  } catch (error) {
    console.error('Error occurred while invoking the model', error);
    throw error;
  }
}

export async function handleReviewComment(event: WebhookEvent, octokit: Octokit) {
  if ('comment' in event && 'pull_request' in event) {
    const { comment, pull_request, repository } = event;
    const commentBody = comment.body.toLowerCase();

    if (commentBody.includes('i pushed a fix in commit')) {
      const commitId = commentBody.split('commit')[1].trim();
      await octokit.pulls.createReplyForReviewComment({
        owner: repository.owner.login,
        repo: repository.name,
        pull_number: pull_request.number,
        comment_id: comment.id,
        body: `Thank you for pushing the fix. I'll review the changes in commit ${commitId}.`
      });
    } else if (commentBody.includes('generate unit testing code for this file')) {
      const unitTests = await generateUnitTestsPerFile(repository.full_name, pull_request.head.ref, comment.path);
      await octokit.pulls.createReplyForReviewComment({
        owner: repository.owner.login,
        repo: repository.name,
        pull_number: pull_request.number,
        comment_id: comment.id,
        body: `Here are the generated unit tests for ${comment.path}:\n\n${unitTests}`
      });
    } else if (commentBody.includes('open a follow-up github issue for this discussion')) {
      const newIssue = await octokit.issues.create({
        owner: repository.owner.login,
        repo: repository.name,
        title: `Follow-up from PR #${pull_request.number}`,
        body: `This issue was created as a follow-up to the discussion in PR #${pull_request.number}.\n\nOriginal comment: ${comment.body}`
    });
      await octokit.pulls.createReplyForReviewComment({
        owner: repository.owner.login,
        repo: repository.name,
        pull_number: pull_request.number,
        comment_id: comment.id,
        body: `I've created a follow-up issue: ${newIssue.data.html_url}`
      });
    }
  }
}

export async function handleFileComment(event: WebhookEvent, octokit: Octokit) {
  if ('comment' in event && 'pull_request' in event) {
    const { comment, pull_request, repository } = event;
    const commentBody = comment.body.toLowerCase();

    if (commentBody.includes('@chatbot generate unit testing code for this file')) {
      const unitTests = await generateUnitTestsPerFile(repository.full_name, pull_request.head.ref, comment.path);
      await octokit.pulls.createReviewComment({
        owner: repository.owner.login,
        repo: repository.name,
        pull_number: pull_request.number,
        commit_id: comment.commit_id,
        path: comment.path,
        body: `Here are the generated unit tests for ${comment.path}:\n\n${unitTests}`,
        line: comment.line ?? undefined
      });
    } else if (commentBody.includes('@chatbot modularize this function')) {
      const line = typeof comment.line === 'number' ? comment.line : undefined;
      if (line !== undefined) {
        const modularizedFunction = await modularizeFunction(repository.full_name, pull_request.head.ref, comment.path, line);
        await octokit.pulls.createReviewComment({
          owner: repository.owner.login,
          repo: repository.name,
          pull_number: pull_request.number,
          commit_id: comment.commit_id,
          path: comment.path,
          body: `Here's a modularized version of the function:\n\n${modularizedFunction}`,
          line: line
        });
      } else {
        console.error('Unable to modularize function: line number is not available');
      }
    }
  }
}

export async function handlePullRequest(event: WebhookEvent, octokit: Octokit) {
  if ('pull_request' in event) {
    const { pull_request, repository } = event;
    const prBody = pull_request.body?.toLowerCase() || '';

    if (prBody.includes('@chatbot review this pr')) {
      // Implement PR review logic here
      const reviewComment = "I've reviewed this PR. Here are my findings: ...";
      await octokit.pulls.createReview({
        owner: repository.owner.login,
        repo: repository.name,
        pull_number: pull_request.number,
        body: reviewComment,
        event: 'COMMENT'
      });
    } else if (prBody.includes('@chatbot summarize changes')) {
      // Implement change summary logic here
      const summary = "Here's a summary of the changes in this PR: ...";
      await octokit.issues.createComment({
        owner: repository.owner.login,
        repo: repository.name,
        issue_number: pull_request.number,
        body: summary
      });
    }
  }
}

export async function handleIssueComment(event: WebhookEvent, octokit: Octokit) {
  if ('comment' in event && 'issue' in event) {
    const { comment, issue, repository } = event;
    const commentBody = comment.body;
    const appName = '@IBTBot';

    if (commentBody.startsWith(appName)) {
      console.log('Handling issue comment with body: ', commentBody)
      const userQuery = commentBody.replace(appName, '').trim();
      try {
        // Classify the user query using the LLM
        const intention = await invokeModel(bedrockClient, modelId, intentionPrompt.replace('{{USER_QUERY}}', userQuery));
        let response = '';
        console.log('User query intention: ', intention)
        switch (intention.trim()) {
          case 'Generate repository stats':
            const stats = await generateStats(repository.full_name);
            response = `Here are some interesting stats about this repository:\n\n${stats}`;
            break;

          case 'Show console.log statements':
            const consoleLogStatements = await findConsoleLogStatements(repository.full_name);
            response = `Here are all the console.log statements in this repository:\n\n${consoleLogStatements}`;
            break;

          case 'Generate unit tests':
            if ('pull_request' in issue && issue.pull_request) {
              try {
                const { data: files } = await octokit.pulls.listFiles({
                  owner: repository.owner.login,
                  repo: repository.name,
                  pull_number: issue.number,
                });
                let allUnitTests = '';
                for (const file of files) {
                  if (file.status !== 'removed') {
                    const unitTests = await generateUnitTestsPerFile(repository.full_name, issue.number.toString(), file.filename);
                    allUnitTests += `Unit tests for ${file.filename}:\n\n${unitTests}\n\n`;
                  }
                }
                response = `Here are the generated unit tests for files involved in this pull request:\n\n${allUnitTests}`;
              } catch (error) {
                console.error('Error fetching files or generating unit tests:', error);
                response = "An error occurred while generating unit tests for the pull request files.";
              }
            } else {
              response = "This issue is not associated with a pull request. Unit tests can only be generated for pull request files for now.";
            }
            break;

          case 'Generate class diagram and README':
            const packagePathPrompt = `Extract the package path from the following user query: "${userQuery}", and output the path only, e.g. src/app, README.md.
            <example>
            user query: Generate a class diagram for the src folder
            output: src

            user query: read the files in the README and generate a class diagram using mermaid and a README in the markdown format
            output: README.md

            user query: read the files in the src/app package and generate a class diagram using mermaid and a README in the markdown format
            output: src/app

            user query: Generate a class diagram for the files in the app folder and generate a README in the markdown format
            output: app
            </example>
            `;
            const packagePath = await invokeModel(bedrockClient, modelId, packagePathPrompt);
            if (packagePath.trim()) {
              const classDiagram = await generateClassDiagram(repository.full_name, packagePath.trim());
              response = `Here's the class diagram for ${packagePath.trim()}:\n\n${classDiagram}\n\nAnd here's a README in markdown format:\n\n[Generated README content]`;
            } else {
              response = "I couldn't determine which package you want a class diagram for. Please specify the package path.";
            }
            break;

          case 'Debug IBTBot configuration':
            const debugInfo = await debugBotConfig(repository.full_name);
            response = `Here's some debug information for the IBTBot configuration:\n\n${debugInfo}`;
            break;

          default:
            // For general queries, use the existing context-based approach
            let context = "Files involved in this PR:\n";
            if ('pull_request' in issue && issue.pull_request) {
              try {
                const { data: files } = await octokit.pulls.listFiles({
                  owner: repository.owner.login,
                  repo: repository.name,
                  pull_number: issue.number,
                });
                for (const file of files) {
                  context += `${file.filename}\n`;
                  if (file.status !== 'removed') {
                    try {
                      const { data: pullRequest } = await octokit.pulls.get({
                        owner: repository.owner.login,
                        repo: repository.name,
                        pull_number: issue.number,
                      });
                      const { data: content } = await octokit.repos.getContent({
                        owner: repository.owner.login,
                        repo: repository.name,
                        path: file.filename,
                        ref: pullRequest.head.sha,
                      });
                      if ('content' in content && typeof content.content === 'string') {
                        context += `Content:\n${Buffer.from(content.content, 'base64').toString('utf-8')}\n\n`;
                      } else {
                        context += `Unable to decode content for this file.\n\n`;
                      }
                    } catch (contentError) {
                      console.error(`Error fetching content for ${file.filename}:`, contentError);
                      context += `Unable to fetch content for this file.\n\n`;
                    }
                  }
                }
              } catch (filesError) {
                console.error('Error fetching files:', filesError);
                context += 'Unable to fetch files for this pull request.\n';
              }
            } else {
              context += 'This is not a pull request, so no files are directly associated.\n';
            }
            const fullQuery = `${context}\n\nUser query: ${userQuery}`;
            response = await invokeModel(bedrockClient, modelId, fullQuery);
        }

        await octokit.issues.createComment({
          owner: repository.owner.login,
          repo: repository.name,
          issue_number: issue.number,
          body: `Here's the response to your query:\n\n${response}`
        });
      } catch (error) {
        console.error('Error processing the request:', error);
        console.error('GitHub App Token:', process.env.GITHUB_APP_TOKEN ? 'Set' : 'Not set');
        console.error('Octokit instance:', octokit ? 'Created' : 'Not created');
        await octokit.issues.createComment({
          owner: repository.owner.login,
          repo: repository.name,
          issue_number: issue.number,
          body: `I apologize, but I encountered an error while processing your request. Please try again later or contact the repository maintainer if the issue persists.`
        });
      }
    }
  }
}