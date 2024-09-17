import { generateUnitTests, runUnitTests, generateTestReport } from '../src/ut_ts';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { TestCase } from '../src/ut_ts';

jest.mock('@aws-sdk/client-bedrock-runtime');
jest.mock('fs');
jest.mock('path');
jest.mock('child_process');

describe('generateUnitTests', () => {
  it('should generate unit tests from source code', async () => {
    const mockSend = jest.fn().mockResolvedValue({
      body: new TextEncoder().encode(JSON.stringify({ content: [{ text: '[{ "type": "direct", "code": "test code" }]' }] }))
    });
    const mockClient = {
      send: mockSend
    } as unknown as BedrockRuntimeClient;

    const result = await generateUnitTests(mockClient, 'modelId', 'sourceCode');
    expect(result).toEqual([{ type: 'direct', code: 'test code' }]);
  });
});

describe('runUnitTests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
  });

  it('should handle empty input array', async () => {
    await runUnitTests([]);
    expect(console.log).toHaveBeenCalledWith('Input test cases', []);
    expect(console.log).toHaveBeenCalledWith('No test cases to run');
  });

  it('should write test cases to file and execute Jest', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    await runUnitTests([{ name: 'Test case 1', type: 'direct', code: 'test code' }]);
    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(execSync).toHaveBeenCalledWith(expect.stringContaining('npx jest'), { stdio: 'inherit' });
  });
});

describe('generateTestReport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
  });

  it('should generate test report and write to file', async () => {
    const testCases = [
      { name: 'Test case 1', type: 'direct', code: 'test code 1' },
      { name: 'Test case 2', type: 'indirect', code: 'test code 2' },
      { name: 'Test case 3', type: 'not-testable', code: 'should be ignored' }
    ];
    await generateTestReport(testCases as TestCase[]);

    expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    expect(fs.writeFileSync).toHaveBeenCalled();
  });
});