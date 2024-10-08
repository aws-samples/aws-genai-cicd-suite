import { getOctokit } from '@actions/github';
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
export declare function generateUnitTestsSuiteDeprecated(client: BedrockRuntimeClient, modelId: string, octokit: ReturnType<typeof getOctokit>, repo: {
    owner: string;
    repo: string;
}, unitTestSourceFolder: string): Promise<void>;
