import { getOctokit, context } from '@actions/github';
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
// using abosolute path to import the functions from testGenerator.ts
import { invokeModel, PullRequest } from '@/src/utils';

const PR_DESCRIPTION_HEADER = "🤖 AI-Generated PR Description (Powered by Amazon Bedrock)";

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

let statsSummary: {file: string, added: number, removed: number, summary?: string}[] = [];

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

async function generateFileSummary(client: BedrockRuntimeClient, modelId: string, patch: string): Promise<string> {
  const prompt = `Summarize the following code changes into concise and clear description in less than 30 words:\n\n${patch}`;
  return await invokeModel(client, modelId, prompt);
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
          statsSummary.push({file: file.filename, added: 0, removed: removed, summary: 'This file is removed in this PR'});
          return `${file.filename}: removed`;
        } else {
          const { data: content } = await octokit.rest.repos.getContent({
            ...repo,
            path: file.filename,
            ref: pullRequest.head.sha,
          });
          const { added, removed } = calculateFilePatchNumLines(file.patch as string);
          const summary = await generateFileSummary(client, modelId, file.patch as string);
          statsSummary.push({file: file.filename, added: added, removed: removed, summary: summary});
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
  
    // Fix the table column width using div element and inline HTML
    const fixedDescription =
    `

## File Stats Summary
  
  File number involved in this PR: *{{FILE_NUMBER}}*, unfold to see the details:
  
  <details>
  
  The file changes summary is as follows:
  
  | <div style="width:150px">Files</div> | <div style="width:160px">Changes</div> | <div style="width:320px">Change Summary</div> |
  |:-------|:--------|:--------------|
  {{FILE_CHANGE_SUMMARY}}
  
  </details>
    `
    const fileChangeSummary = statsSummary.map(file => {
      // const fileName = file.file.length > 60 ? file.file.substring(0, 60) + '...' : file.file;
      const fileName = file.file;
      const changes = `${file.added} added, ${file.removed} removed`;
      return `| ${fileName} | ${changes} | ${file.summary || ''} |`
    }).join('\n');
    const fileNumber = statsSummary.length.toString();
    const updatedDescription = fixedDescription
      .replace('{{FILE_CHANGE_SUMMARY}}', fileChangeSummary)
      .replace('{{FILE_NUMBER}}', fileNumber);
  
    // append fixed template content to the generated PR description
    const prDescriptionWithStats = prDescription + updatedDescription;
  
    // Prepend the header to the PR description
    const prDescriptionWithHeader = `${PR_DESCRIPTION_HEADER}\n\n${prDescriptionWithStats}`;
  
    await octokit.rest.pulls.update({
      ...repo,
      pull_number: pullRequest.number,
      body: prDescriptionWithHeader,
    });
    console.log('PR description updated successfully.');
  }
  