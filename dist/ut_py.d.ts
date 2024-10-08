import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
interface TestCase {
    name: string;
    type: 'direct' | 'indirect' | 'not-testable';
    code: string;
}
export declare function generateUnitTests(client: BedrockRuntimeClient, modelId: string, sourceCode: string): Promise<TestCase[]>;
export declare function runUnitTests(testCases: TestCase[]): Promise<void>;
export declare function generateTestReport(testCases: TestCase[]): Promise<void>;
export declare function setupPythonEnvironment(): Promise<void>;
export {};
