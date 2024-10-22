export interface TestCase {
    name: string;
    type: 'direct' | 'indirect' | 'not-testable';
    code: string;
}

export async function generateFakeResponse(): Promise<TestCase[]> {
    // Return a predefined fake response structure
    return [
        {
            name: 'Default Unit Test due to the model time out during the test generation, most likely due to the prompt being too long',
            type: 'direct',
            code: "test('default test', () => { expect(true).toBe(true); });",
        },
    ];
}

export function createPrompt(sourceCode: string): string {
    return `
    You are an expert TypeScript developer specializing in unit testing. Your task is to analyze the following TypeScript code and generate comprehensive unit tests using Jest.

    <source_code>
    ${sourceCode}
    </source_code>

    Please follow these steps:
    1. Carefully read and understand the provided TypeScript code.
    2. Categorize each method into one of these types:
       a) Methods that can be tested directly
       b) Methods that can be tested indirectly
       c) Methods that are not unit-testable
    3. For each testable method, create a unit test using Jest.
    4. Structure your response as a JSON array of test cases, where each test case has the following format:
       {
           "name": "Test name",
           "type": "direct" | "indirect" | "not-testable",
           "code": "The actual test code"
       }

    Important guidelines:
    - Ensure your tests are comprehensive and cover various scenarios, including edge cases.
    - Use clear and descriptive test names.
    - Include comments in your test code to explain the purpose of each test.
    - Follow TypeScript and Jest best practices.
    - For methods that are not unit-testable, explain why in a comment.
    - Make sure to import all necessary dependencies and mock external modules.
    - Use jest.mock() to mock external dependencies like fs, path, and child_process.
    - Include setup and teardown code (beforeEach, afterEach) where necessary.
    - Use appropriate Jest matchers (e.g., toHaveBeenCalledWith, toThrow) for precise assertions.
    - Consider using test.each for parameterized tests when appropriate.
    - Ensure that async functions are properly tested using async/await syntax.

    Here's an example of the expected output format:
    <example>
    [
      {
        "name": "Test input validation with empty array",
        "type": "direct",
        "code": "import { runUnitTests } from '../src/yourFile';\nimport * as fs from 'fs';\nimport * as path from 'path';\n\njest.mock('fs');\njest.mock('path');\njest.mock('child_process');\n\ndescribe('runUnitTests', () => {\n  beforeEach(() => {\n    jest.clearAllMocks();\n    console.log = jest.fn();\n  });\n\n  it('should handle empty input array', async () => {\n    // Test that the function handles an empty input array correctly\n    await runUnitTests([]);\n    expect(console.log).toHaveBeenCalledWith('Input test cases', []);\n    expect(console.log).toHaveBeenCalledWith('No test cases to run');\n  });\n});"
      }
    ]
    </example>

    After generating the test cases, please review your output and ensure:
    1. The tests are fully executable and correctly written.
    2. The code is thoroughly commented for a beginner to understand.
    3. The tests follow TypeScript and Jest best practices.
    4. All external dependencies are properly mocked.
    5. Edge cases and error scenarios are covered.

    Provide your response as a valid JSON array containing objects with the specified structure. Do not include any explanatory text outside of the JSON array.
    `;
}