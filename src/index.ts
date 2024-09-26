import * as core from '@actions/core';
import { getOctokit, context } from '@actions/github';
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { setTimeout } from 'timers/promises';

// current we support typescript and python, while the python library is not available yet, we will use typescript as the default language
// using abosolute path to import the functions from testGenerator.ts
import { generateUnitTests, runUnitTests, generateTestReport } from '@/src/testGenerator';
import { generatePRDescription } from '@/src/prGeneration';
import { generateCodeReviewComment } from '@/src/codeReviewInline';
import { invokeModel, PullRequest } from '@/src/utils';

export async function generateUnitTestsSuite(client: BedrockRuntimeClient, modelId: string, octokit: ReturnType<typeof getOctokit>, repo: { owner: string, repo: string }, unitTestSourceFolder: string): Promise<void> {
  const pullRequest = context.payload.pull_request as PullRequest;
  const branchName = pullRequest.head.ref;
  let allTestCases: any[] = [];

  // Check if the "auto-unit-test-baseline" tag exists
  const { data: tags } = await octokit.rest.repos.listTags({
    ...repo,
    per_page: 100,
  });
  const baselineTagExists = tags.some(tag => tag.name === 'auto-unit-test-baseline');

  if (!baselineTagExists) {
    // Generate tests for all .ts files in the specified folder
    try {
      const { data: files } = await octokit.rest.repos.getContent({
        ...repo,
        path: unitTestSourceFolder,
      });

      if (Array.isArray(files)) {
        for (const file of files) {
          if (file.type === 'file') {
            const { data: content } = await octokit.rest.repos.getContent({
              ...repo,
              path: file.path,
            });
            if ('content' in content && typeof content.content === 'string') {
              const decodedContent = Buffer.from(content.content, 'base64').toString('utf8');
              const testCases = await generateUnitTests(client, modelId, decodedContent);
              allTestCases = allTestCases.concat(testCases);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to list files in the specified folder, make sure the folder is correct, error: ', error);
      return;
    }

    // Create the baseline tag (changed from "auto unit test baseline" to "auto-unit-test-baseline")
    try {
      await octokit.rest.git.createRef({
        ...repo,
        ref: 'refs/tags/auto-unit-test-baseline',
        sha: pullRequest.head.sha,
      });
      console.log('Tag created successfully');
      await setTimeout(5000); // Wait for 5 seconds
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  } else {
    // Generate tests only for files changed in the PR
    const { data: changedFiles } = await octokit.rest.pulls.listFiles({
      ...repo,
      pull_number: pullRequest.number,
    });

    for (const file of changedFiles) {
      if (file.filename.startsWith(unitTestSourceFolder)) {
        const { data: content } = await octokit.rest.repos.getContent({
          ...repo,
          path: file.filename,
          ref: pullRequest.head.sha,
        });
        if ('content' in content && typeof content.content === 'string') {
          const decodedContent = Buffer.from(content.content, 'base64').toString('utf8');
          const testCases = await generateUnitTests(client, modelId, decodedContent);
          allTestCases = allTestCases.concat(testCases);
        }
      }
    }
  }

  if (allTestCases.length === 0) {
    console.warn('No test cases generated. Skipping unit tests execution and report generation.');
    return;
  }

  await runUnitTests(allTestCases, unitTestSourceFolder);
  await generateTestReport(allTestCases);
  console.log('Unit tests and report generated successfully.');

  // Add the generated unit tests to existing PR
  if (pullRequest) {
    try {
      if (!branchName) {
        throw new Error('Unable to determine the branch name');
      }

      // Create a new file with the generated unit tests in test folder
      const unitTestsContent = allTestCases.map(tc => tc.code).join('\n\n');
      const unitTestsFileName = 'test/unit_tests.ts';

      // Check if the file already exists
      let fileSha: string | undefined;
      try {
        const { data: existingFile } = await octokit.rest.repos.getContent({
          ...repo,
          path: unitTestsFileName,
          ref: branchName,
        });
        if ('sha' in existingFile) {
          fileSha = existingFile.sha;
        }
      } catch (error) {
        // File doesn't exist, which is fine for the first time
        console.log(`File ${unitTestsFileName} does not exist in the repository. Creating it.`);
      }

      await octokit.rest.repos.createOrUpdateFileContents({
        ...repo,
        path: unitTestsFileName,
        message: 'Add or update generated unit tests',
        content: Buffer.from(unitTestsContent).toString('base64'),
        branch: branchName,
        sha: fileSha, // Include the sha if the file exists, undefined otherwise
      });

      console.log(`Unit tests file ${unitTestsFileName} created or updated successfully.`);

    } catch (error) {
      console.error('Error occurred while pushing the changes to the PR branch', error);
      throw error;
    }
  }
}

async function run(): Promise<void> {
  try {
    const githubToken = core.getInput('github-token');
    const awsRegion = core.getInput('aws-region');
    const modelId = core.getInput('model-id');
    const excludeFiles = core.getInput('generate-code-review-exclude-files');
    const reviewLevel = core.getInput('generate-code-review-level');
    const generateCodeReview = core.getInput('generate-code-review');
    const generatePrDescription = core.getInput('generate-pr-description');
    const generateUnitTest = core.getInput('generate-unit-test');
    const outputLanguage = core.getInput('output-language');
    const unitTestSourceFolder = core.getInput('generate-unit-test-source-folder');

    const excludePatterns = excludeFiles ? excludeFiles.split(',').map(p => p.trim()) : [];

    console.log(`GitHub Token: ${githubToken ? 'Token is set' : 'Token is not set'}`);
    console.log(`AWS Region: ${awsRegion}`);
    console.log(`Model ID: ${modelId}`);
    console.log(`Excluded files: ${excludeFiles}`);
    console.log(`Code review: ${generateCodeReview}`);
    console.log(`Output language: ${outputLanguage}`);
    console.log(`Review level: ${reviewLevel}`);
    console.log(`Generate PR description: ${generatePrDescription.toLowerCase() === 'true' ? 'true' : 'false'}`);
    console.log(`Generate unit test suite: ${generateUnitTest.toLowerCase() === 'true' ? 'true' : 'false'}`);
    console.log(`Test folder path: ${unitTestSourceFolder}`);
    if (!githubToken) {
      throw new Error('GitHub token is not set');
    }

    const bedrockClient = new BedrockRuntimeClient({ region: awsRegion || 'us-east-1' });
    const octokit = getOctokit(githubToken);

    if (!context.payload.pull_request) {
      console.log('No pull request found in the context. This action should be run only on pull request events.');
      return;
    }

    const pullRequest = context.payload.pull_request as PullRequest;
    const repo = context.repo;

    console.log(`Reviewing PR #${pullRequest.number} in ${repo.owner}/${repo.repo}`);

    // branch to generate PR description
    if (generatePrDescription.toLowerCase() === 'true') {
      await generatePRDescription(bedrockClient, modelId, octokit);
    }

    // branch to generate code review comments
    if (generateCodeReview.toLowerCase() === 'true') {
      await generateCodeReviewComment(bedrockClient, modelId, octokit, excludePatterns, reviewLevel, outputLanguage);
    }

    // branch to generate unit tests suite
    if (generateUnitTest.toLowerCase() === 'true') {
      if (!unitTestSourceFolder) {
        throw new Error('Test folder path is not specified');
      }
      await generateUnitTestsSuite(bedrockClient, modelId, octokit, repo, unitTestSourceFolder);
    }

  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Error: ${error.message}`);
      console.error('Stack trace:', error.stack);
    } else {
      core.setFailed('An unknown error occurred');
    }
  }
}

run();
