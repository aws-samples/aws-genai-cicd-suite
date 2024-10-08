export declare function analyzeCoverage(testFilePath: string, sourceCode: string): Promise<{
    statements: number;
    branches: number;
    functions: number;
    lines: number;
}>;
