import { Prompts } from '../prompts';
import { ICoverageSummary } from './testValidator';

export interface ITestInfo {
    testName: string;
    testSource: string;
    prompt: Prompts;
}

export interface IPromptInfo {
    prompt: Prompts;
    completionsCount: number;
}

export interface ITestResultCollector {
    recordTestInfo(testInfo: ITestInfo): void;
    recordTestResult(testInfo: ITestInfo & { outcome: { status: string; error?: string } }): void;
    recordPromptInfo(prompt: Prompts, completionsCount: number): void;
    recordCoverageInfo(coverageSummary: ICoverageSummary): void;
    hasPrompt(prompt: Prompts): boolean;
    getTestResults(): Array<ITestInfo & { outcome: { status: string; error?: string } }>;
    getCoverageInfo(): ICoverageSummary;
}

export class BaseTestResultCollector implements ITestResultCollector {
    private tests: Map<string, ITestInfo> = new Map();
    private prompts: Map<string, IPromptInfo> = new Map();
    private testResults: Array<ITestInfo & { outcome: { status: string; error?: string } }> = [];
    private coverageInfo: ICoverageSummary | null = null;

    recordTestInfo(testInfo: ITestInfo): void {
        this.tests.set(testInfo.testName, testInfo);
    }

    recordTestResult(testInfo: ITestInfo & { outcome: { status: string; error?: string } }): void {
        this.testResults.push(testInfo);
    }

    recordPromptInfo(prompt: Prompts, completionsCount: number): void {
        this.prompts.set(prompt.id, { prompt, completionsCount });
    }

    recordCoverageInfo(coverageSummary: ICoverageSummary): void {
        this.coverageInfo = coverageSummary;
    }

    hasPrompt(prompt: Prompts): boolean {
        return this.prompts.has(prompt.id);
    }

    getTestResults(): Array<ITestInfo & { outcome: { status: string; error?: string } }> {
        return this.testResults;
    }

    getTestSource(testName: string): string | null {
        const testInfo = this.tests.get(testName);
        return testInfo ? testInfo.testSource : null;
    }

    getCoverageInfo(): ICoverageSummary {
        return this.coverageInfo || {
            lines: { total: 0, covered: 0, skipped: 0, pct: 0 },
            statements: { total: 0, covered: 0, skipped: 0, pct: 0 },
            functions: { total: 0, covered: 0, skipped: 0, pct: 0 },
            branches: { total: 0, covered: 0, skipped: 0, pct: 0 }
        };
    }
}