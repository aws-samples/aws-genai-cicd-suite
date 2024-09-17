import { invokeModel, generatePRDescription, generateUnitTestsSuite, generateCodeReviewComment } from '../src/index';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { mockClient } from "aws-sdk-client-mock";
import { getOctokit, context } from '@actions/github';
import * as fs from 'fs';

jest.mock('@aws-sdk/client-bedrock-runtime');
jest.mock('@actions/github');
jest.mock('fs');
jest.mock('child_process');

// Mock the BedrockRuntimeClient
const bedrockClientMock = mockClient(BedrockRuntimeClient);

// Before each test, reset the mock
beforeEach(() => {
  bedrockClientMock.reset();
});

// Add this before the tests
process.env['INPUT_GITHUB_TOKEN'] = 'dummy-token';

describe('invokeModel', () => {
  it('should invoke the model and return the result', async () => {
    const mockResponse = {
      body: {
        transformToString: () => JSON.stringify({ content: [{ text: 'Mocked response' }] }),
      },
    };
    const result = await invokeModel(bedrockClientMock as unknown as BedrockRuntimeClient, 'modelId', 'Test input');
    expect(mockResponse).toBe('Mocked response');
  });
});

describe('generatePRDescription', () => {
  it('should generate PR description and update PR', async () => {
    const mockClient = new BedrockRuntimeClient({});
    const mockOctokit = {
      rest: {
        pulls: {
          listFiles: jest.fn().mockResolvedValue({ data: [] }),
          update: jest.fn().mockResolvedValue({}),
        },
        repos: {
          getContent: jest.fn().mockResolvedValue({ data: {} }),
        },
      },
    };

    await generatePRDescription(mockClient, 'modelId', mockOctokit as any);

    expect(mockOctokit.rest.pulls.listFiles).toHaveBeenCalled();
    expect(mockOctokit.rest.pulls.update).toHaveBeenCalled();
  });
});

describe('generateUnitTestsSuite', () => {
  it('should generate unit tests suite and update PR', async () => {
    // Mock file system operations
    (fs.readFileSync as jest.Mock).mockReturnValue('mocked file content');
    
    const mockClient = new BedrockRuntimeClient({});
    const mockOctokit = {
      rest: {
        pulls: {
          listFiles: jest.fn().mockResolvedValue({ data: [] }),
        },
        repos: {
          createOrUpdateFileContents: jest.fn().mockResolvedValue({}),
        },
      },
    };

    await generateUnitTestsSuite(mockClient, 'modelId', mockOctokit as any, { owner: 'owner', repo: 'repo' });

    expect(mockOctokit.rest.pulls.listFiles).toHaveBeenCalled();
    expect(mockOctokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalled();
  });
});

describe('generateCodeReviewComment', () => {
  it('should generate code review comments and post to PR', async () => {
    const mockResponse = {
      body: new TextEncoder().encode(JSON.stringify({ content: [{ text: 'Mocked review comment' }] })),
    };
    bedrockClientMock.on(InvokeModelCommand).resolves(mockResponse as any);

    const mockClient = new BedrockRuntimeClient({});
    const mockOctokit = {
      rest: {
        pulls: {
          listFiles: jest.fn().mockResolvedValue({ data: [{ filename: 'test.ts', patch: '+test', status: 'modified' }] }),
          createReview: jest.fn().mockResolvedValue({}),
        },
      },
    };

    await generateCodeReviewComment(bedrockClientMock as any, 'modelId', mockOctokit as any, [], 'concise');

    expect(mockOctokit.rest.pulls.listFiles).toHaveBeenCalled();
    expect(mockOctokit.rest.pulls.createReview).toHaveBeenCalled();
  });
});