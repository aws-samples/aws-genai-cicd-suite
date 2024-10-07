import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { invokeModel } from "../utils";

export interface ICompletionModel {
    getCompletions(prompt: string, temperature: number): Promise<string[]>;
}

export class LanguageModel implements ICompletionModel {
    constructor(
        private client: BedrockRuntimeClient,
        private modelId: string
    ) {}

    async getCompletions(prompt: string, temperature: number): Promise<string[]> {
        try {
            const completion = await invokeModel(this.client, this.modelId, prompt, temperature);
            // return the array of completions, only one completion for now
            return [completion];
        } catch (error) {
            console.error("Error getting completions:", error);
            return [];
        }
    }
}