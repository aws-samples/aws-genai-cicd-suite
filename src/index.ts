import * as core from "@actions/core";
import { getOctokit, context } from "@actions/github";
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { setTimeout } from "timers/promises";

// current we support typescript and python, while the python library is not available yet, we will use typescript as the default language
// using abosolute path to import the functions from testGenerator.ts
import { generatePRDescription } from "@/src/prGeneration";
import { generateCodeReviewComment } from "@/src/codeReviewInline";
import { generateUnitTestsSuite } from "@/src/preview/testGenerator";
import { PullRequest } from "@/src/utils";

async function run(retryCount: number = 3): Promise<void> {
  try {
    const githubToken = core.getInput("github-token");
    const awsRegion = core.getInput("aws-region");
    const modelId = core.getInput("model-id");
    const excludeFiles = core.getInput("generate-code-review-exclude-files");
    const excludePatterns = excludeFiles ? excludeFiles.split(",").map((p) => p.trim()) : [];
    const reviewLevel = core.getInput("generate-code-review-level");
    const generateCodeReview = core.getInput("generate-code-review");
    const generatePrDescription = core.getInput("generate-pr-description");
    const generateUnitTest = core.getInput("generate-unit-test");
    const outputLanguage = core.getInput("output-language");
    const unitTestSourceFolder = core.getInput("generate-unit-test-source-folder");
    const unitTestExcludeFiles = core.getInput("generate-unit-test-exclude-files");
    const unitTestExcludePatterns = unitTestExcludeFiles ? unitTestExcludeFiles.split(",").map((p) => p.trim()) : [];

    console.log(`GitHub Token: ${githubToken ? "Token is set" : "Token is not set"}`);
    console.log(`AWS Region: ${awsRegion}`);
    console.log(`Model ID: ${modelId}`);
    console.log(`Excluded files: ${excludeFiles}`);
    console.log(`Code review: ${generateCodeReview}`);
    console.log(`Output language: ${outputLanguage}`);
    console.log(`Review level: ${reviewLevel}`);
    console.log(`Generate PR description: ${generatePrDescription.toLowerCase() === "true" ? "true" : "false"}`);
    console.log(`Generate unit test suite: ${generateUnitTest.toLowerCase() === "true" ? "true" : "false"}`);
    console.log(`Generate unit test source folder: ${unitTestSourceFolder}`);
    console.log(`Generate unit test exclude files: ${unitTestExcludeFiles}`);

    if (!githubToken) {
      throw new Error("GitHub token is not set");
    }

    const bedrockClient = new BedrockRuntimeClient({ region: awsRegion || "us-east-1" });
    const octokit = getOctokit(githubToken);

    if (!context.payload.pull_request) {
      console.log("No pull request found in the context. This action should be run only on pull request events.");
      return;
    }

    const pullRequest = context.payload.pull_request as PullRequest;
    const repo = context.repo;

    console.log(`Reviewing PR #${pullRequest.number} in ${repo.owner}/${repo.repo}`);

    // branch to generate PR description
    if (generatePrDescription.toLowerCase() === "true") {
      await generatePRDescription(bedrockClient, modelId, octokit);
    }

    // branch to generate code review comments
    if (generateCodeReview.toLowerCase() === "true") {
      await generateCodeReviewComment(bedrockClient, modelId, octokit, excludePatterns, reviewLevel, outputLanguage);
    }

    // branch to generate unit tests suite
    if (generateUnitTest.toLowerCase() === "true") {
      console.log("Start to generate unit test suite");
      if (!unitTestSourceFolder) {
        throw new Error("Test folder path is not specified");
      }
      /* 
      export async function generateUnitTestsSuite(
        client: BedrockRuntimeClient,
        modelId: string,
        octokit: ReturnType<typeof getOctokit>,
        excludePatterns: string[],
        repo: { owner: string, repo: string },
        unitTestSourceFolder: string
      )  
      */
      await generateUnitTestsSuite(bedrockClient, modelId, octokit, repo, unitTestSourceFolder);
    }
  } catch (error: any) {
    // Ensure the error is of type Error
    if (error instanceof Error) {
      core.error(`Error: ${error.message}`);

      // Log the stack trace directly to the console if available
      if (error.stack) {
        console.error("Stack trace:", error.stack);
      }

      // Check the retry count and attempt retries
      if (retryCount > 0) {
        core.warning(`Retrying... Attempts remaining: ${retryCount}`);
        await setTimeout(5000); // Wait for 5 seconds using timers/promises setTimeout directly
        await run(retryCount - 1); // Recursive call to run with reduced retry count
      } else {
        // No retries left, mark the action as failed
        core.setFailed(`Action failed after multiple retries: ${error.message}`);
        process.exit(1); // Ensure GitHub Action fails
      }
    } else {
      // Handle unknown error types
      core.setFailed("An unknown error occurred");
      process.exit(1);
    }
  }
}

run();

/* retry 1 time, interval 5 seconds */
run(1).catch((error) => {
  core.error("Unhandled error in run():", error);
  core.setFailed(`Unhandled error in run(): ${(error as Error).message}`);
  process.exit(1);
});
