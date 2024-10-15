import { Octokit } from '@octokit/rest';
import { WebhookEvent } from '@octokit/webhooks-types';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { IntentionClassifier } from './IntentionClassifier';
import { ActionExecutor } from './ActionExecutor';
import { FunctionRegistry } from './FunctionRegistry';
import { FunctionType } from './ActionTypeDeterminer';
import { generateUnitTestsPerFile, modularizeFunction, generateStats, findConsoleLogStatements, generateClassDiagram, debugBotConfig } from './utilsApp';

const bedrockClient = new BedrockRuntimeClient({ region: 'us-east-1' });
const modelId = 'anthropic.claude-3-sonnet-20240229-v1:0';

const intentionClassifier = new IntentionClassifier(bedrockClient, modelId);
const functionRegistry = new FunctionRegistry();
const actionExecutor = new ActionExecutor(functionRegistry, bedrockClient, modelId);

// Register functions
functionRegistry.registerFunction({
  id: 'generateUnitTests',
  name: 'Generate Unit Tests',
  type: FunctionType.CodebaseAware,
  execute: async (query: string, context: any) => {
    const { repository, issue, comment } = context;
    return generateUnitTestsPerFile(repository.full_name, issue.number.toString(), comment.path);
  }
});

functionRegistry.registerFunction({
  id: 'modularizeFunction',
  name: 'Modularize Function',
  type: FunctionType.CodebaseAware,
  execute: async (query: string, context: any) => {
    const { repository, pull_request, comment } = context;
    return modularizeFunction(repository.full_name, pull_request.head.ref, comment.path, comment.line);
  }
});

functionRegistry.registerFunction({
  id: 'generateStats',
  name: 'Generate Repository Stats',
  type: FunctionType.ExternalAPI,
  execute: async (query: string, context: any) => {
    const { repository } = context;
    return generateStats(repository.full_name);
  }
});

functionRegistry.registerFunction({
  id: 'findConsoleLogStatements',
  name: 'Find Console Log Statements',
  type: FunctionType.CodebaseAware,
  execute: async (query: string, context: any) => {
    const { repository } = context;
    return findConsoleLogStatements(repository.full_name);
  }
});

functionRegistry.registerFunction({
  id: 'generateClassDiagram',
  name: 'Generate Class Diagram',
  type: FunctionType.CodebaseAware,
  execute: async (query: string, context: any) => {
    const { repository } = context;
    // Extract package path from query or use a default
    const packagePath = query.includes('package') ? query.split('package')[1].trim() : 'src';
    return generateClassDiagram(repository.full_name, packagePath);
  }
});

functionRegistry.registerFunction({
  id: 'debugBotConfig',
  name: 'Debug Bot Configuration',
  type: FunctionType.ExternalAPI,
  execute: async (query: string, context: any) => {
    const { repository } = context;
    return debugBotConfig(repository.full_name);
  }
});

// Entry point for issue comments raise in PR
export async function handleIssueComment(event: WebhookEvent, octokit: Octokit) {
  if ('comment' in event && 'issue' in event) {
    const { comment, issue, repository } = event;
    const commentBody = comment.body;
    const appName = '@IBTBot';

    if (commentBody.startsWith(appName)) {
      console.log('Handling issue comment with body: ', commentBody)
      const userQuery = commentBody.replace(appName, '').trim();
      try {
        const context = {
          repository: repository,
          issue: issue,
          comment: comment
        };

        const intention = await intentionClassifier.classify(userQuery, context);
        console.log('User query intention: ', intention);

        const result = await actionExecutor.execute(intention, userQuery, context);

        let response = '';
        if (result.success) {
          response = `Here's the response to your query:\n\n${result.result}`;
        } else {
          response = `I apologize, but I encountered an error while processing your request: ${result.error}`;
        }

        await octokit.issues.createComment({
          owner: repository.owner.login,
          repo: repository.name,
          issue_number: issue.number,
          body: response
        });
      } catch (error) {
        console.error('Error processing the request:', error);
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

// Implement handleReviewComment and handlePullRequest functions
export async function handleReviewComment(event: WebhookEvent, octokit: Octokit) {
  // Implementation goes here
}

export async function handlePullRequest(event: WebhookEvent, octokit: Octokit) {
  // Implementation goes here
}
