export interface ICoverageSummary {
    lines: {
        total: number;
        covered: number;
        skipped: number;
        pct: number;
    };
    statements: {
        total: number;
        covered: number;
        skipped: number;
        pct: number;
    };
    functions: {
        total: number;
        covered: number;
        skipped: number;
        pct: number;
    };
    branches: {
        total: number;
        covered: number;
        skipped: number;
        pct: number;
    };
}
export declare class TestValidator {
    private packagePath;
    private testDir;
    private coverageDirs;
    constructor(packagePath?: string);
    validateTest(testName: string, testSource: string, rootDir: string): {
        status: string;
        error?: string;
    };
    private ensureTsJestInstalled;
    getCoverageSummary(): ICoverageSummary;
    private addCoverage;
    private calculatePercentages;
}
