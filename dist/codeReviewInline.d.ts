import { getOctokit } from '@actions/github';
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
export declare function generateCodeReviewComment(bedrockClient: BedrockRuntimeClient, modelId: string, octokit: ReturnType<typeof getOctokit>, excludePatterns: string[], reviewLevel: string, outputLanguage: string): Promise<void>;
