import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
export type LanguageCode = 'en' | 'zh' | 'ja' | 'es' | 'fr' | 'de' | 'it';
export interface PullRequest {
    title: string;
    number: number;
    body: string;
    head: {
        sha: string;
        ref: string;
    };
    base: {
        sha: string;
    };
}
export interface PullFile {
    filename: string;
    status: string;
    patch?: string;
}
export declare const languageCodeToName: Record<LanguageCode, string>;
export declare function splitContentIntoChunks_deprecated(content: string, maxChunkSize: number): string[];
export declare function shouldExcludeFile(filename: string, excludePatterns: string[]): boolean;
export declare function splitIntoSoloFile(combinedCode: string): Record<string, string>;
export declare function extractFunctions(content: string): Promise<string[]>;
export declare function exponentialBackoff<T>(fn: () => Promise<T>, maxRetries: number, initialDelay: number, functionName: string): Promise<T>;
export declare function invokeModel(client: BedrockRuntimeClient, modelId: string, payloadInput: string, temperature?: number): Promise<string>;
