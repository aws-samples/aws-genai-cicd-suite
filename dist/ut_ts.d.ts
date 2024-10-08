import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { TestCase } from './testUtils';
export declare function generateUnitTests(client: BedrockRuntimeClient, modelId: string, sourceCode: string): Promise<TestCase[]>;
export declare function runUnitTests(testCases: TestCase[], unitTestSourceFolder: string): Promise<void>;
export declare function generateTestReport(testCases: TestCase[]): Promise<void>;
