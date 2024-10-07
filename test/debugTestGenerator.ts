import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { generateUnitTestsSuite } from "../src/preview/testGenerator";
import { getOctokit } from "@actions/github";
import { context } from "@actions/github";
import * as fs from 'fs';

const bedrockClient = new BedrockRuntimeClient({ region: 'us-east-1' });

// Sample file content
const sampleFileContent = `
export function add(a: number, b: number): number {
  return a + b;
}

export function subtract(a: number, b: number): number {
  return a - b;
}
`;

// Mock Octokit
const mockOctokit = {
  rest: {
    repos: {
      listTags: async () => ({ data: [] }),
      getContent: async ({ path }) => {
        if (path === 'test') {
          return {
            data: [
              {
                type: 'file',
                name: 'sample.ts',
                path: 'test/sample.ts',
              },
            ],
          };
        } else if (path === 'test/sample.ts') {
          return {
            data: {
              content: Buffer.from(sampleFileContent).toString('base64'),
              encoding: 'base64',
            },
          };
        }
      },
      createOrUpdateFileContents: async ({ content }) => {
        fs.writeFileSync('debug_generated_tests.ts', Buffer.from(content, 'base64').toString('utf8'));
        console.log('Generated tests written to debug_generated_tests.ts');
        return {};
      },
    },
    git: {
      createRef: async () => {
        console.log('Mock: Created tag auto-unit-test-baseline');
        return {};
      },
    },
    pulls: {
      listFiles: async () => ({ data: [] }),
    },
  },
} as unknown as ReturnType<typeof getOctokit>;

// Mock GitHub context
(context as any).payload = {
  pull_request: {
    head: {
      ref: 'feature-branch',
      sha: 'abc123',
    },
    number: 1,
  },
};

async function main() {

  // Setup the test environment, create the sample.ts to be tested
  fs.writeFileSync('sample.ts', sampleFileContent);

  // Run the test generation
  try {
    await generateUnitTestsSuite(
      bedrockClient,
      "anthropic.claude-3-sonnet-20240229-v1:0", // or any other model ID you're using
      mockOctokit,
      { owner: "testuser", repo: "testrepo" },
      "test"
    );
    console.log("Unit tests generation completed");
  } catch (error) {
    console.error("Error generating unit tests:", error);
  }

  // Check if test cases are generated
  const testCases = fs.readFileSync('debug_generated_tests.ts', 'utf8');
  console.log(testCases);

  // Clean up the test environment
  fs.unlinkSync('sample.ts');
  fs.unlinkSync('debug_generated_tests.ts');
}

main();