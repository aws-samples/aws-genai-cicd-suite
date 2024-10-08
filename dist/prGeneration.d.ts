import { getOctokit } from '@actions/github';
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
export declare function generatePRDescription(client: BedrockRuntimeClient, modelId: string, octokit: ReturnType<typeof getOctokit>): Promise<void>;
