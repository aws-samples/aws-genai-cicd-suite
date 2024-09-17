jest.mock('@actions/github', () => ({
  context: {
    repo: {
      owner: 'testOwner',
      repo: 'testRepo',
    },
    payload: {
      pull_request: {
        number: 1,
        head: {
          sha: 'testSha',
          ref: 'testRef',
        },
      },
    },
  },
  getOctokit: jest.fn(),
}));

jest.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: jest.fn(),
  InvokeModelCommand: jest.fn(),
}));