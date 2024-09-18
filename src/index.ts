import * as core from '@actions/core';
import { getOctokit, context } from '@actions/github';
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { setTimeout } from 'timers/promises';

// current we support typescript and python, while the python library is not available yet, we will use typescript as the default language
// using abosolute path to import the functions from ut_ts.ts
import { generateUnitTests, runUnitTests, generateTestReport } from '@/src/ut_ts';
import { invokeModel } from '@/src/utils';

interface PullRequest {
  number: number;
  body: string;
  head: {
    sha: string;
    ref: string;
  };
}

interface ReviewComment {
  path: string;
  body: string;
  position?: number;
}

interface PullFile {
  filename: string;
  status: string;
  patch?: string;
}

// Define the LanguageCode type
type LanguageCode = 'en' | 'zh' | 'ja' | 'es' | 'fr' | 'de' | 'it';

// Update the languageCodeToName object with the correct type
const languageCodeToName: Record<LanguageCode, string> = {
  'en': 'English',
  'zh': 'Chinese',
  'ja': 'Japanese',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
};

// This function splits the content into chunks of maxChunkSize
function splitContentIntoChunks_deprecated(content: string, maxChunkSize: number): string[] {
  const chunks: string[] = [];
  let currentChunk = '';

  content.split('\n').forEach(line => {
    if (currentChunk.length + line.length > maxChunkSize) {
      chunks.push(currentChunk);
      currentChunk = '';
    }
    currentChunk += line + '\n';
  });

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function shouldExcludeFile(filename: string, excludePatterns: string[]): boolean {
  return excludePatterns.some(pattern => {
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    return regex.test(filename);
  });
}

const pr_generation_prompt =
`
<task context>
You are a developer tasked with creating a pull request (PR) for a software project. Your primary goal is to provide a clear and informative description of the changes you are proposing.
</task context>

<tone context>
Maintain a professional and informative tone. Be clear and concise in your descriptions.
</tone context>

<code_change>
This pull request includes the following changes, in format of file name: file status:
[Insert the code change to be referenced in the PR description]
</code_change>

<detailed_task_description>
Please include a summary of the changes in one of the following categories:
- Bug fix (non-breaking change which fixes an issue)
- New feature (non-breaking change which adds functionality)
- Breaking change (fix or feature that would cause existing functionality to not work as expected)
- This change requires a documentation update

Please also include relevant motivation and context. List any dependencies that are required for this change.
</detailed_task_description>

<output_format>
Provide your PR description in the following format:
# Description
[Insert the PR description here]

## Type of change
[Select one of the following options in the checkbox]
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] This change requires a documentation update
</output_format>
`;

let statsSummary: {file: string, added: number, removed: number}[] = [];

function calculateFilePatchNumLines(fileChange: string): { added: number, removed: number } {
  const lines = fileChange.split('\n');
  let added = 0;
  let removed = 0;

  lines.forEach(line => {
    if (line.startsWith('+')) {
      added++;
    } else if (line.startsWith('-')) {
      removed++;
    }
  });

  return { added, removed };
}

export async function generatePRDescription(client: BedrockRuntimeClient, modelId: string, octokit: ReturnType<typeof getOctokit>): Promise<void> {

  const pullRequest = context.payload.pull_request as PullRequest;
  const repo = context.repo;

  // fetch the list of files changed in the PR each time since the file can be changed in operation like unit test generation, code review, etc.
  const { data: files } = await octokit.rest.pulls.listFiles({
    ...repo,
    pull_number: pullRequest.number,
  });

  const fileNameAndStatus = await Promise.all(files.map(async (file) => {
    try {
      if (file.status === 'removed') {
        const { added, removed } = calculateFilePatchNumLines(file.patch as string);
        statsSummary.push({file: file.filename, added: 0, removed: removed});
        return `${file.filename}: removed`;
      } else {
        const { data: content } = await octokit.rest.repos.getContent({
          ...repo,
          path: file.filename,
          ref: pullRequest.head.sha,
        });
        const { added, removed } = calculateFilePatchNumLines(file.patch as string);
        statsSummary.push({file: file.filename, added: added, removed: removed});
        return `${file.filename}: ${file.status}`;
      }
    } catch (error) {
      if ((error as any).status === 404) {
        console.log(`File ${file.filename} not found in the repository`);
        return `${file.filename}: not found`;
      }
      return `${file.filename}: error`;
    }
  }));

  const prDescriptionTemplate = pr_generation_prompt.replace('[Insert the code change to be referenced in the PR description]', fileNameAndStatus.join('\n'));

  // invoke model to generate complete PR description
  const payloadInput = prDescriptionTemplate;
  const prDescription = await invokeModel(client, modelId, payloadInput);

  const fixedDescription =
  `

## File Stats Summary
The file changes summary is as follows:
- File number involved in this PR: {{FILE_NUMBER}}
- File changes summary:
{{FILE_CHANGE_SUMMARY}}
  `
  const fileChangeSummary = statsSummary.map(file => `${file.file}: ${file.added} added, ${file.removed} removed`).join('\n');
  const fileNumber = statsSummary.length.toString();
  const updatedDescription = fixedDescription
    .replace('{{FILE_CHANGE_SUMMARY}}', fileChangeSummary)
    .replace('{{FILE_NUMBER}}', fileNumber);

  // append fixed template content to the generated PR description
  const prDescriptionWithStats = prDescription + updatedDescription;

  await octokit.rest.pulls.update({
    ...repo,
    pull_number: pullRequest.number,
    body: prDescriptionWithStats,
  });
  console.log('PR description updated successfully.');
}

function splitIntoSoloFile(combinedCode: string): Record<string, string> {
  // split the whole combinedCode content into individual files (index.ts, index_test.ts, index.js) by recognize the character like: "// File: ./index.ts", filter the content with suffix ".tx" and not contain "test" in file name (index.ts),
  const fileChunks: Record<string, string> = {};
  const filePattern = /\/\/ File: \.\/(.+)/;
  let currentFile = '';
  let currentContent = '';

  combinedCode.split('\n').forEach(line => {
    const match = line.match(filePattern);
    if (match) {
      if (currentFile) {
        fileChunks[currentFile] = currentContent.trim();
      }
      currentFile = match[1] as string;
      currentContent = '';
    } else {
      currentContent += line + '\n';
    }
  });

  if (currentFile) {
    fileChunks[currentFile] = currentContent.trim();
  }
  return fileChunks;
}

async function extractFunctions(content: string): Promise<string[]> {
  // const functionPattern = /(?:export\s+)?(?:async\s+)?function\s+\w+\s*\([^)]*\)(?:\s*:\s*[^{]*?)?\s*{(?:[^{}]*|\{(?:[^{}]*|\{[^{}]*\})*\})*}/gs;
  // const matches = content.match(functionPattern);
  // return matches ? matches.map(match => match.trim()) : [];

  // Dummy response for debugging purposes
  return [
    'export async function generateUnitTests(client: BedrockRuntimeClient, modelId: string, sourceCode: string): Promise<TestCase[]> { ... }',
    'async function runUnitTests(testCases: TestCase[], sourceCode: string): Promise<void> { ... }',
    'function generateTestReport(testCases: TestCase[]): Promise<void> { ... }',
  ];
}

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

// Refer to https://google.github.io/eng-practices/review/reviewer/looking-for.html and https://google.github.io/eng-practices/review/reviewer/standard.html
const detailed_review_prompt = 
`<task_context>
You are an expert code reviewer tasked with reviewing a code change (CL) for a software project. Your primary goal is to ensure that the overall code health of the system is improving while allowing developers to make progress. Your feedback should be constructive, educational, and focused on the most important issues.
</task_context>

<tone_context>
Maintain a constructive and educational tone. Be thorough but not overly pedantic. Remember that the goal is continuous improvement, not perfection.
</tone_context>

<code_change>
{{CODE_SNIPPET}}
</code_change>

<detailed_task_description>
Review the provided code change, which is presented in diff format. Lines starting with '+' are additions, and lines starting with '-' are removals. Consider the following aspects:
1. Design: Evaluate the overall design and how it integrates with the existing system.
2. Functionality: Assess if the code does what it's intended to do and if it's good for the users.
3. Complexity: Check if the code is more complex than necessary.
4. Tests: Verify the presence and quality of unit, integration, or end-to-end tests.
5. Naming: Ensure clear and appropriate naming for variables, functions, and classes.
6. Comments: Check for clear and useful comments that explain why, not what.
7. Style: Verify adherence to the project's style guide.
8. Documentation: Check if necessary documentation is updated or added.
9. Potential issues: Look for possible concurrency problems, edge cases, or error handling issues.
10. Code health: Assess if the change improves the overall code health of the system.

Provide feedback on these aspects, categorizing your comments as follows:
- Critical: Issues that must be addressed before approval.
- Improvement: Suggestions that would significantly improve the code but aren't blocking.
- Suggestion: Minor stylistic or preferential changes, prefixed with "Suggestion:".
</detailed_task_description>

<rules>
1. Focus on the most important issues that affect code health and functionality.
2. Balance the need for improvement with the need to make progress.
3. Be specific in your feedback, referencing line numbers when applicable.
4. Explain the reasoning behind your suggestions, especially for design-related feedback.
5. If suggesting an alternative approach, briefly explain its benefits.
6. Acknowledge good practices and improvements in the code.
7. If relevant, mention any educational points that could help the developer learn, prefixed with "Learning opportunity:".
</rules>

If changed code is good or simple enough to skip or not fitting in categories: Critical, Improvements, Suggestions, please answer only "Looks Good To Me" directly. Otherwise provide your review in the following format. Limit the total response within 100 words, the output language should be {{LANGUAGE_NAME}}, and follow the output format below.

Summary:
Conclude the review with one of the following statements: "Approve", "Approve with minor modifications", or "Request changes", in ONLY one of the categories below

Critical Issues:
List any critical issues that need to be addressed, mandatory to include if the summary is "Request changes"

Improvements:
List potential improvements, mandatory to include if the summary is "Approve with minor modifications"

Suggestions:
List any minor suggestions, optional to include
`;

const concise_review_prompt =
`<task_context>
You are an expert code reviewer tasked with reviewing a code change (CL) for a software project. Your primary goal is to ensure that the overall code health of the system is improving while allowing developers to make progress. Your feedback should be constructive, educational, and focused on the most important issues.
</task_context>

<tone_context>
Maintain a constructive and educational tone. Be thorough but not overly pedantic. Remember that the goal is continuous improvement, not perfection.
</tone_context>

<code_change>
{{CODE_SNIPPET}}
</code_change>

<detailed_task_description>
Review the provided code change, which is presented in diff format. Lines starting with '+' are additions, and lines starting with '-' are removals. Consider the following aspects:
1. Design: Evaluate the overall design and how it integrates with the existing system.
2. Functionality: Assess if the code does what it's intended to do and if it's good for the users.
3. Complexity: Check if the code is more complex than necessary.
4. Tests: Verify the presence and quality of unit, integration, or end-to-end tests.
5. Comments: Check for clear and useful comments that explain why, not what.
6. Potential issues: Look for possible concurrency problems, edge cases, or error handling issues.

Provide feedback on these aspects, categorizing your comments as follows:
- Critical: Issues that must be addressed before approval.
- Improvement: Suggestions that would significantly improve the code but aren't blocking.
</detailed_task_description>

<rules>
1. Focus on the most important issues that affect code health and functionality.
2. Balance the need for improvement with the need to make progress.
3. Be specific in your feedback, referencing line numbers when applicable.
4. Explain the reasoning behind your suggestions, especially for design-related feedback.
5. If suggesting an alternative approach, briefly explain its benefits.
</rules>

If changed code is good or simple enough to skip or not fitting in categories: Critical, Improvements, please answer only "Looks Good To Me" directly. Otherwise provide your review in the following format. Limit the total response within 50 words. The output language should be {{LANGUAGE_NAME}}, and follow the output format below.

Summary:
Conclude the review with one of the following statements: "Approve", "Approve with minor modifications", or "Request changes", in ONLY one of the categories below

Critical Issues:
List any critical issues that need to be addressed, mandatory to include if the summary is "Request changes"

Improvements:
List potential improvements, mandatory to include if the summary is "Approve with minor modifications"
`;

export async function generateCodeReviewComment(bedrockClient: BedrockRuntimeClient, modelId: string, octokit: ReturnType<typeof getOctokit>, excludePatterns: string[], reviewLevel: string, outputLanguage: string): Promise<void> {

  const pullRequest = context.payload.pull_request as PullRequest;
  const repo = context.repo;

  // fetch the list of files changed in the PR each time since the file can be changed in operation like unit test generation etc.
  const { data: files } = await octokit.rest.pulls.listFiles({
    ...repo,
    pull_number: pullRequest.number,
  });

  let reviewComments: { path: string; position: number; body: string }[] = [];

  for (const file of files as PullFile[]) {
    // The sample contents of file.patch, which contains a unified diff representation of the changes made to a file in a pull request:
    // diff --git a/file1.txt b/file1.txt
    // index 7cfc5c8..e69de29 100644
    // --- a/file1.txt
    // +++ b/file1.txt
    // @@ -1,3 +1,2 @@
    // -This is the original line 1.
    // -This is the original line 2.
    // +This is the new line 1.
    //  This is an unchanged line.
    // @@ is the hunk header that shows where the changes are and how many lines are changed. In this case, it indicates that the changes start at line 1 of the old file and affect 3 lines, and start at line 1 of the new file and affect 2 lines.

    // console.log(`File patch content: ${file.patch} for file: ${file.filename}`);
    if (file.status !== 'removed' && file.patch && !shouldExcludeFile(file.filename, excludePatterns)) {

      // Split the patch into hunks
      const hunks = file.patch.split(/^@@\s+-\d+,\d+\s+\+\d+,\d+\s+@@/m);
      let totalPosition = 0;
      console.log(`======================= Debugging Hunks of file: ${file.filename} ========================\n ${hunks}\n ================================================`);
      for (const [hunkIndex, hunk] of hunks.entries()) {
        if (hunkIndex === 0) continue; // Skip the first element (it's empty due to the split)
        const hunkLines = hunk.split('\n').slice(1); // Remove the hunk header

        // Include all lines in the hunk, preserving '+' and '-' prefixes
        const diffContent = hunkLines.join('\n');
        console.log(`======================= Debugging Diff content ========================\n ${diffContent}\n ================================================`);
        const promptTemplate = reviewLevel === 'detailed' ? detailed_review_prompt : concise_review_prompt;
        let formattedContent = promptTemplate.replace('{{CODE_SNIPPET}}', diffContent);

        const languageName = languageCodeToName[outputLanguage as LanguageCode] || 'English';
        if (!(outputLanguage in languageCodeToName)) {
          core.warning(`Unsupported output language: ${outputLanguage}. Defaulting to English.`);
        }
        formattedContent = formattedContent.replace('{{LANGUAGE_NAME}}', languageName);

        // invoke model to generate review comments
        var review = await invokeModel(bedrockClient, modelId, formattedContent);  

        // log the generated review comments and check if it is empty
        // console.log(`Review comments ${review} generated for file: ${file.filename} in hunk ${hunkIndex} with file content: ${fileContent}`);

        if (!review || review.trim() == '') {
          console.warn(`No review comments generated for hunk ${hunkIndex} in file ${file.filename}, skipping`);
          continue;
        }

        // add the generated review comments to the end of per hunk
        const position = totalPosition + 1;
        reviewComments.push({
          path: file.filename,
          position: position,
          body: review,
        });
        totalPosition += hunkLines.length;
      }
    } else {
      console.log(`Skipping file: ${file.filename} due to the file being removed or explicitly excluded`);
    }
  }

  if (reviewComments.length > 0) {
    // TODO: solve the performance issue that the review comments may overwhelm the server and lead 502 error
    try {
      await octokit.rest.pulls.createReview({
        ...repo,
        pull_number: pullRequest.number,
        commit_id: pullRequest.head.sha,
        body: 'Code review comments',
        event: 'COMMENT',
        comments: reviewComments,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });
      console.log('Code review comments posted successfully.');
    } catch (error) {
      console.error('Error posting code review comments:', error);
      throw error;
    }
  } else {
    console.log('No review comments to post.');
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

    // branch to generate unit tests suite
    if (generateUnitTest.toLowerCase() === 'true') {
      if (!unitTestSourceFolder) {
        throw new Error('Test folder path is not specified');
      }
      await generateUnitTestsSuite(bedrockClient, modelId, octokit, repo, unitTestSourceFolder);
    }

    // branch to generate code review comments
    if (generateCodeReview.toLowerCase() === 'true') {
      // Wait for a fixed amount of time (e.g., 5 seconds)
      // const delayMs = 5000; // 5 seconds
      // console.log(`Waiting ${delayMs}ms for GitHub to process the changes...`);
      // await new Promise(resolve => setTimeout(resolve, delayMs));
      await generateCodeReviewComment(bedrockClient, modelId, octokit, excludePatterns, reviewLevel, outputLanguage);
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
