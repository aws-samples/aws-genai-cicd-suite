import * as core from '@actions/core';
import { getOctokit, context } from '@actions/github';
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { invokeModel, PullRequest, PullFile, shouldExcludeFile, languageCodeToName, LanguageCode } from '@/src/utils';
import { Inputs, Prompts} from '@/src/prompts';

const CODE_REVIEW_HEADER = "🔍 AI Code Review (Powered by Amazon Bedrock)";

export async function generateCodeReviewComment(bedrockClient: BedrockRuntimeClient, modelId: string, octokit: ReturnType<typeof getOctokit>, excludePatterns: string[], reviewLevel: string, outputLanguage: string): Promise<void> {

  const pullRequest = context.payload.pull_request as PullRequest;
  const repo = context.repo;

  // fetch the list of files changed in the PR each time since the file can be changed in operation like unit test generation etc.
  const { data: files } = await octokit.rest.pulls.listFiles({
    ...repo,
    pull_number: pullRequest.number,
  });

  let reviewComments: { path: string; position: number; body: string }[] = [];
  let ignoredFilesCount = 0;
  let selectedFilesCount = 0;
  let additionalCommentsCount = 0;
  let ignoredFilesDetails: string[] = [];
  let selectedFilesDetails: string[] = [];
  let additionalCommentsDetails: string[] = [];

  const inputs: Inputs = new Inputs()
  const prompts: Prompts = new Prompts()

  for (const file of files as PullFile[]) {
    // The sample contents of file.patch, which contains a unified diff representation of the changes made to a file in a pull request, with multiple hunks in the file
    // diff --git a/file1.txt b/file1.txt
    // index 7cfc5c8..e69de29 100644
    // --- a/file1.txt
    // +++ b/file1.txt

    // @@ -1,3 +1,2 @@
    // -This is the original line 1.
    // -This is the original line 2.
    // +This is the new line 1.
    //  This is an unchanged line.
    // @@ -10,3 +10,2 @@
    // -This is the original line 10.
    // -This is the original line 11.
    // +This is the new line 10.
    //  This is an unchanged line.

    // @@ is the hunk header that shows where the changes are and how many lines are changed. In this case, it indicates that the changes start at line 1 of the old file and affect 3 lines, and start at line 1 of the new file and affect 2 lines.

    // console.log(`File patch content: ${file.patch} for file: ${file.filename}`);
    if (file.status !== 'removed' && file.patch && !shouldExcludeFile(file.filename, excludePatterns)) {
      selectedFilesCount++;

      // Split the patch into hunks, but keep the hunk headers
      const hunks = file.patch.split(/(?=^@@\s+-\d+,\d+\s+\+\d+,\d+\s+@@)/m);
      // console.log(`=========================================== File patch for ${file.filename} ===========================================`);
      // console.log(`Hunks: ${hunks}`);
      // console.log(`=========================================== File patch for ${file.filename} ===========================================`);
      selectedFilesDetails.push(`${file.filename} (${hunks.length} hunks)`);

      let totalPosition = 0;
      for (const [hunkIndex, hunk] of hunks.entries()) {
        // hunkLines and hunkContent indeed contain the same information, just in different formats:
        // hunkLines is an array of strings, where each string represents a line of the hunk.
        // hunkContent is a single string, which is the result of joining all the lines in hunkLines with newline characters.
        const hunkLines = hunk.split('\n')
        const hunkContent = hunkLines.join('\n');
        const languageName = languageCodeToName[outputLanguage as LanguageCode] || 'English';
        if (!(outputLanguage in languageCodeToName)) {
          core.warning(`Unsupported output language: ${outputLanguage}. Defaulting to English.`);
        }

        // console.log(`=========================================== Hunk ${hunkIndex} of ${file.filename} ===========================================`);
        // console.log(`Hunk: ${hunk}`);
        // console.log(`Hunk lines: ${hunkLines}`);
        // console.log(`Hunk content: ${hunkContent}`);
        // console.log(`=========================================== Hunk ${hunkIndex} of ${file.filename} ===========================================`);

        // Assemble the inputs for the prompt
        inputs.title = pullRequest.title;
        inputs.description = pullRequest.body;
        // inputs.rawSummary = pullRequest.body;
        // inputs.shortSummary = pullRequest.body;
        inputs.fileName = file.filename;
        // inputs.fileContent = file.patch;
        // inputs.fileDiff = file.patch;
        inputs.hunkContent = hunkContent;
        // inputs.patches = file.patch;
        // inputs.diff = file.patch;
        // inputs.commentChain = file.patch;
        // inputs.comment = file.patch;
        inputs.languageName = languageName;

        var finalPromt = reviewLevel === 'detailed' ? prompts.renderDetailedReviewPrompt(inputs) : prompts.renderConciseReviewPrompt(inputs);
        var review = await invokeModel(bedrockClient, modelId, finalPromt);  

        if (!review || review.trim() == '') {
          console.warn(`No review comments generated for hunk ${hunkIndex} in file ${file.filename}, skipping`);
          continue;
        }

        // TODO, this is a temporary workaround to remove all the xml tag with content "review comments" in the output if it exists, e.g. <Review Comments>, <review Comments>, <review comment>, <Review comment> and </Review Comments>, </review Comments>, </review comment>, </Review comment>
        review = review.replace(/<Review Comments>|<\/Review Comments>|<review Comments>|<\/review Comments>|<review comment>|<\/review comment>|<Review comment>|<\/Review comment>/g, '').trim();

        if (review.includes('Looks Good To Me')) {
          additionalCommentsCount++;
          // add delimiter symbol "---" per file end to make the output more readable
          additionalCommentsDetails.push(`${file.filename} (hunk index: ${hunkIndex}):\n${review}\n\n---\n`);
          continue;
        }

        // Prepend the header to each review comment
        const reviewWithHeader = `${CODE_REVIEW_HEADER}\n\n${review}`;

        // add the generated review comments to the end of per hunk
        const position = totalPosition + 1;
        reviewComments.push({
          path: file.filename,
          position: position,
          body: reviewWithHeader,
        });
        totalPosition += hunkLines.length;
      }
    } else {
      ignoredFilesCount++;
      console.log(`Skipping file: ${file.filename} due to the file being removed or explicitly excluded`);
      ignoredFilesDetails.push(`${file.filename} is excluded by exclude rules`);
    }
  }
  
  // we always post the summary even if there is no review comments, so that we can let the user know the review level and the number of files processed
  if (reviewComments.length > 0 || additionalCommentsCount > 0) {
    let summaryTemplate = `
{{CODE_REVIEW_HEADER}}

Actionable comments posted: ${reviewComments.length}
<details>
<summary>Review Details</summary>
<details>
<summary>Review option chosen</summary>

- **Configuration used: GitHub Actions**
- **Code review level: ${reviewLevel}**
</details>
<details>
<summary>Commits</summary>
Files that changed from the base of the PR and between ${pullRequest.base.sha} to ${pullRequest.head.sha}
</details>
<details>
<summary>Files ignored due to path filters (${ignoredFilesCount})</summary>

${ignoredFilesDetails.map(file => `- ${file}`).join('\n')}
</details>
<details>
<summary>Files selected for processing (${selectedFilesCount})</summary>

${selectedFilesDetails.map(file => `- ${file}`).join('\n')}
</details>
<details>
<summary>Additional comments not posted (${additionalCommentsCount})</summary>

${additionalCommentsDetails.map(file => `- ${file}`).join('\n')}
</details>
</details>
`;
    summaryTemplate = summaryTemplate.replace('{{CODE_REVIEW_HEADER}}', CODE_REVIEW_HEADER);
    try {
      await octokit.rest.pulls.createReview({
        ...repo,
        pull_number: pullRequest.number,
        commit_id: pullRequest.head.sha,
        body: summaryTemplate,
        event: 'COMMENT',
        // The review comment here will be empty if all the review comments are skipped due to "Looks Good To Me"
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
