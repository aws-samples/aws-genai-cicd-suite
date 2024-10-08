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
    recordTestResult(testInfo: ITestInfo & {
        outcome: {
            status: string;
            error?: string;
        };
    }): void;
    recordPromptInfo(prompt: Prompts, completionsCount: number): void;
    recordCoverageInfo(coverageSummary: ICoverageSummary): void;
    hasPrompt(prompt: Prompts): boolean;
    getTestResults(): Array<ITestInfo & {
        outcome: {
            status: string;
            error?: string;
        };
    }>;
    getCoverageInfo(): ICoverageSummary;
}
export declare class BaseTestResultCollector implements ITestResultCollector {
    private tests;
    private prompts;
    private testResults;
    private coverageInfo;
    recordTestInfo(testInfo: ITestInfo): void;
    recordTestResult(testInfo: ITestInfo & {
        outcome: {
            status: string;
            error?: string;
        };
    }): void;
    recordPromptInfo(prompt: Prompts, completionsCount: number): void;
    recordCoverageInfo(coverageSummary: ICoverageSummary): void;
    hasPrompt(prompt: Prompts): boolean;
    getTestResults(): Array<ITestInfo & {
        outcome: {
            status: string;
            error?: string;
        };
    }>;
    getTestSource(testName: string): string | null;
    getCoverageInfo(): ICoverageSummary;
}
