import { Inputs, Prompts } from '../../src/prompts';
import { invokeModel } from '../../src/utils';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';

export class IntentionClassifier {
  private client: BedrockRuntimeClient;
  private modelId: string;

  constructor(client: BedrockRuntimeClient, modelId: string) {
    this.client = client;
    this.modelId = modelId;
  }

  async classify(query: string, context: any): Promise<string> {
    const inputs = new Inputs();
    const prompts = new Prompts();

    inputs.userQuery = query;
    const prompt = prompts.renderIntentionClassificationPrompt(inputs);
    console.log('Intention classification prompt: ', prompt);

    const result = await invokeModel(this.client, this.modelId, prompt);
    return result;
  }
}
