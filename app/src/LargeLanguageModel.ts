import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { invokeModel } from '../../src/utils';

export class LargeLanguageModel {
  private client: BedrockRuntimeClient;
  private modelId: string;

  constructor(client: BedrockRuntimeClient, modelId: string) {
    this.client = client;
    this.modelId = modelId;
  }

  async classify(prompt: string): Promise<string> {
    try {
      const result = await invokeModel(this.client, this.modelId, prompt);
      return result.trim();
    } catch (error) {
      console.error('Error occurred while classifying:', error);
      throw error;
    }
  }
}
