import * as fs from 'fs';
import * as path from 'path';
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { execSync } from 'child_process';

interface TestCase {
    name: string;
    type: 'direct' | 'indirect' | 'not-testable';
    code: string;
}

export async function generateUnitTests(client: BedrockRuntimeClient, modelId: string, sourceCode: string): Promise<TestCase[]> {
    const prompt = `
    Analyze the following Python code and generate unit tests:

    ${sourceCode}

    Categorize the methods into:
    1. Methods that can be tested directly
    2. Methods that can be tested indirectly
    3. Methods that are not unit-testable

    For each testable method, create a unit test using pytest. 
    Return the results as a JSON array of test cases, where each test case has the following structure:
    {
        "name": "Test name",
        "type": "direct" | "indirect" | "not-testable",
        "code": "The actual test code"
    }

    Assess whether the LLM’s output is fully executable and correctly written to validate the source code. If the LLM's output is correct, return the code verbatim as it was, if not, fix the code and return the corrected version that: 1. fully executable; 2. commented thorougly enough for a beginner to understand; 3. follows the best practices of the language.
    `;

    const command = new InvokeModelCommand({
        modelId: modelId,
        contentType: "application/json",
        body: JSON.stringify({
            prompt: prompt,
            max_tokens: 4096,
            temperature: 0.7,
        }),
    });

    const response = await client.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));
    return JSON.parse(result.completion);
}

export async function runUnitTests(testCases: TestCase[]): Promise<void> {
    const testDir = path.join(__dirname, '..', 'tests');
    if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
    }

    const testFilePath = path.join(testDir, 'test_generated.py');
    const testFileContent = testCases
        .filter(tc => tc.type !== 'not-testable')
        .map(tc => tc.code)
        .join('\n\n');

    fs.writeFileSync(testFilePath, testFileContent);

    try {
        execSync('pytest tests/test_generated.py', { stdio: 'inherit' });
    } catch (error) {
        console.error('Error running tests:', error);
    }
}

export async function generateTestReport(testCases: TestCase[]): Promise<void> {
    const report = {
        totalTests: testCases.length,
        directTests: testCases.filter(tc => tc.type === 'direct').length,
        indirectTests: testCases.filter(tc => tc.type === 'indirect').length,
        notTestable: testCases.filter(tc => tc.type === 'not-testable').length,
    };

    const reportDir = path.join(__dirname, '..', 'reports');
    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
    }

    const reportPath = path.join(reportDir, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
}

export async function setupPythonEnvironment(): Promise<void> {
    try {
        execSync('python -m venv venv');
        execSync('source venv/bin/activate && pip install pytest');
    } catch (error) {
        console.error('Error setting up Python environment:', error);
    }
}
