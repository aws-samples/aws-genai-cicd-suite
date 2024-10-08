import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
export interface ICompletionModel {
    getCompletions(prompt: string, temperature: number): Promise<string[]>;
}
export declare class LanguageModel implements ICompletionModel {
    private client;
    private modelId;
    constructor(client: BedrockRuntimeClient, modelId: string);
    getCompletions(prompt: string, temperature: number): Promise<string[]>;
}
