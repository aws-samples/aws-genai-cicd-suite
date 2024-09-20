import { splitContentIntoChunks_deprecated } from '../src/utils';

describe('splitContentIntoChunks_deprecated', () => {
  it('should split content into chunks with the specified maximum chunk size', () => {
    const content = 'Line 1\
Line 2\
Line 3\
Line 4\
Line 5';
    const maxChunkSize = 10;
    const expectedChunks = ['Line 1\
', 'Line 2\
', 'Line 3\
', 'Line 4\
', 'Line 5'];

    const chunks = splitContentIntoChunks_deprecated(content, maxChunkSize);

    expect(chunks).toEqual(expectedChunks);
  });

  it('should handle empty content', () => {
    const content = '';
    const maxChunkSize = 10;
    const expectedChunks = [];

    const chunks = splitContentIntoChunks_deprecated(content, maxChunkSize);

    expect(chunks).toEqual(expectedChunks);
  });

  it('should handle content with a single long line', () => {
    const content = 'This is a very long line that should not be split';
    const maxChunkSize = 10;
    const expectedChunks = ['This is a', ' very lon', 'g line th', 'at should', ' not be s', 'plit'];

    const chunks = splitContentIntoChunks_deprecated(content, maxChunkSize);

    expect(chunks).toEqual(expectedChunks);
  });
});


import { shouldExcludeFile } from '../src/utils';

describe('shouldExcludeFile', () => {
  it('should return true if the filename matches any exclude pattern', () => {
    const filename = 'src/utils.ts';
    const excludePatterns = ['*.js', 'src/*.ts'];

    const result = shouldExcludeFile(filename, excludePatterns);

    expect(result).toBe(true);
  });

  it('should return false if the filename does not match any exclude pattern', () => {
    const filename = 'src/index.ts';
    const excludePatterns = ['*.js', 'test/*'];

    const result = shouldExcludeFile(filename, excludePatterns);

    expect(result).toBe(false);
  });

  it('should handle wildcard patterns correctly', () => {
    const filename = 'src/utils/helpers.ts';
    const excludePatterns = ['src/utils/*'];

    const result = shouldExcludeFile(filename, excludePatterns);

    expect(result).toBe(true);
  });

  it('should handle an empty exclude patterns array', () => {
    const filename = 'src/index.ts';
    const excludePatterns = [];

    const result = shouldExcludeFile(filename, excludePatterns);

    expect(result).toBe(false);
  });
});


import { calculateFilePatchNumLines } from '../src/utils';

describe('calculateFilePatchNumLines', () => {
  it('should correctly count added and removed lines in a file patch', () => {
    const filePatch = `@@ -1,3 +1,4 @@
-line1
 line2
+line3
+line4`;
    const { added, removed } = calculateFilePatchNumLines(filePatch);

    expect(added).toBe(2);
    expect(removed).toBe(1);
  });

  it('should handle an empty file patch', () => {
    const filePatch = '';
    const { added, removed } = calculateFilePatchNumLines(filePatch);

    expect(added).toBe(0);
    expect(removed).toBe(0);
  });

  it('should handle a file patch with only additions', () => {
    const filePatch = `@@ -1,3 +1,5 @@
 line1
 line2
+line3
+line4`;
    const { added, removed } = calculateFilePatchNumLines(filePatch);

    expect(added).toBe(2);
    expect(removed).toBe(0);
  });

  it('should handle a file patch with only removals', () => {
    const filePatch = `@@ -1,4 +1,3 @@
-line1
 line2
 line3
-line4`;
    const { added, removed } = calculateFilePatchNumLines(filePatch);

    expect(added).toBe(0);
    expect(removed).toBe(2);
  });
});


import { extractFunctions } from '../src/utils';

describe('extractFunctions', () => {
  it('should extract functions from the provided code', async () => {
    const code = `
      function add(a, b) {
        return a + b;
      }

      export async function calculateSum(nums) {
        let sum = 0;
        for (const num of nums) {
          sum += num;
        }
        return sum;
      }

      const multiply = (a, b) => a * b;
    `;

    const expectedFunctions = [
      'function add(a, b) {\
        return a + b;\
      }',
      'export async function calculateSum(nums) {\
        let sum = 0;\
        for (const num of nums) {\
          sum += num;\
        }\
        return sum;\
      }',
      'const multiply = (a, b) => a * b;',
    ];

    const extractedFunctions = await extractFunctions(code);

    expect(extractedFunctions).toEqual(expectedFunctions);
  });

  it('should handle an empty code string', async () => {
    const code = '';
    const expectedFunctions = [];

    const extractedFunctions = await extractFunctions(code);

    expect(extractedFunctions).toEqual(expectedFunctions);
  });

  it('should handle a code string without functions', async () => {
    const code = 'const x = 42;\
console.log(x);';
    const expectedFunctions = [];

    const extractedFunctions = await extractFunctions(code);

    expect(extractedFunctions).toEqual(expectedFunctions);
  });
});


import { generatePRDescription } from '../src/utils';
import * as github from '@actions/github';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';

jest.mock('@actions/github');
jest.mock('@aws-sdk/client-bedrock-runtime');

describe('generatePRDescription', () => {
  const mockClient = {} as BedrockRuntimeClient;
  const mockOctokit = {
    rest: {
      pulls: {
        listFiles: jest.fn(),
        update: jest.fn(),
      },
      repos: {
        getContent: jest.fn(),
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    github.context.payload.pull_request = {
      number: 123,
      head: {
        sha: 'abc123',
        ref: 'feature/test',
      },
    } as github.context.Payload;
    github.context.repo = {
      owner: 'test-org',
      repo: 'test-repo',
    };
  });

  it('should generate a PR description and update the PR', async () => {
    const mockFiles = [
      { filename: 'file1.ts', status: 'modified', patch: '+line1\
-line2' },
      { filename: 'file2.ts', status: 'added', patch: '+line1\
+line2' },
    ];
    mockOctokit.rest.pulls.listFiles.mockResolvedValue({ data: mockFiles });
    mockOctokit.rest.repos.getContent.mockResolvedValue({
      data: { content: Buffer.from('file content').toString('base64') },
    });

    await generatePRDescription(mockClient, 'test-model', mockOctokit);

    expect(mockOctokit.rest.pulls.update).toHaveBeenCalledWith({
      owner: 'test-org',
      repo: 'test-repo',
      pull_number: 123,
      body: expect.any(String),
    });
  });

  it('should handle errors when listing files or getting content', async () => {
    mockOctokit.rest.pulls.listFiles.mockRejectedValue(new Error('List files error'));
    mockOctokit.rest.repos.getContent.mockRejectedValue(new Error('Get content error'));

    await expect(generatePRDescription(mockClient, 'test-model', mockOctokit)).rejects.toThrow();
  });
});
