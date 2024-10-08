export interface TestCase {
    name: string;
    type: 'direct' | 'indirect' | 'not-testable';
    code: string;
}
export declare function generateFakeResponse(): Promise<TestCase[]>;
export declare function createPrompt(sourceCode: string): string;
