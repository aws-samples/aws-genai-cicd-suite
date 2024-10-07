import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

// Define the LanguageCode type
export type LanguageCode = 'en' | 'zh' | 'ja' | 'es' | 'fr' | 'de' | 'it';

// Full definition of PullRequest from GitHub API can be found at https://gist.github.com/GuillaumeFalourd/e53ec9b6bc783cce184bd1eec263799d
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

// Update the languageCodeToName object with the correct type
export const languageCodeToName: Record<LanguageCode, string> = {
  'en': 'English',
  'zh': 'Chinese',
  'ja': 'Japanese',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
};

// This function splits the content into chunks of maxChunkSize
export function splitContentIntoChunks_deprecated(content: string, maxChunkSize: number): string[] {
  const chunks: string[] = [];
  let currentChunk = '';

  content.split('\n').forEach(line => {
    if (currentChunk.length + line.length > maxChunkSize) {
      chunks.push(currentChunk);
      currentChunk = '';
    }
    currentChunk += line + '\n';
  });

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

export function shouldExcludeFile(filename: string, excludePatterns: string[]): boolean {
  return excludePatterns.some(pattern => {
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    return regex.test(filename);
  });
}

export function splitIntoSoloFile(combinedCode: string): Record<string, string> {
  // split the whole combinedCode content into individual files (index.ts, index_test.ts, index.js) by recognize the character like: "// File: ./index.ts", filter the content with suffix ".tx" and not contain "test" in file name (index.ts),
  const fileChunks: Record<string, string> = {};
  const filePattern = /\/\/ File: \.\/(.+)/;
  let currentFile = '';
  let currentContent = '';

  combinedCode.split('\n').forEach(line => {
    const match = line.match(filePattern);
    if (match) {
      if (currentFile) {
        fileChunks[currentFile] = currentContent.trim();
      }
      currentFile = match[1] as string;
      currentContent = '';
    } else {
      currentContent += line + '\n';
    }
  });

  if (currentFile) {
    fileChunks[currentFile] = currentContent.trim();
  }
  return fileChunks;
}

export async function extractFunctions(content: string): Promise<string[]> {
  // const functionPattern = /(?:export\s+)?(?:async\s+)?function\s+\w+\s*\([^)]*\)(?:\s*:\s*[^{]*?)?\s*{(?:[^{}]*|\{(?:[^{}]*|\{[^{}]*\})*\})*}/gs;
  // const matches = content.match(functionPattern);
  // return matches ? matches.map(match => match.trim()) : [];

  // Dummy response for debugging purposes
  return [
    'export async function generateUnitTests(client: BedrockRuntimeClient, modelId: string, sourceCode: string): Promise<TestCase[]> { ... }',
    'async function runUnitTests(testCases: TestCase[], sourceCode: string): Promise<void> { ... }',
    'function generateTestReport(testCases: TestCase[]): Promise<void> { ... }',
  ];
}

export async function exponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  initialDelay: number,
  functionName: string
): Promise<T> {
  let retries = 0;
  while (true) {
    try {
      const result = await fn();
      console.log(`Function '${functionName}' executed successfully on attempt ${retries + 1}`);
      return result;
    } catch (error) {
      if (retries >= maxRetries) {
        console.error(`Max retries (${maxRetries}) reached for function '${functionName}'. Throwing error.`);
        throw error;
      }
      const delay = initialDelay * Math.pow(2, retries);
      console.log(`Attempt ${retries + 1} for function '${functionName}' failed. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      retries++;
    }
  }
}

// note the default temperature is 1 according to official documentation: https://docs.anthropic.com/en/api/complete
export async function invokeModel(client: BedrockRuntimeClient, modelId: string, payloadInput: string, temperature: number = 0.6): Promise<string> {
    const maxRetries = 3;
    const initialDelay = 1000; // 1 second

    const invokeWithRetry = async (): Promise<string> => {
      try {
        // seperate branch to invoke RESTFul endpoint exposed by API Gateway, if the modelId is prefixed with string like "sagemaker.<api id>.execute-api.<region>.amazonaws.com/prod"
        if (modelId.startsWith("sagemaker.")) {
          // invoke RESTFul endpoint e.g. curl -X POST -H "Content-Type: application/json" -d '{"prompt": "import argparse\ndef main(string: str):\n    print(string)\n    print(string[::-1])\n    if __name__ == \"__main__\":", "parameters": {"max_new_tokens": 256, "temperature": 0.1}}' https://<api id>.execute-api.<region>.amazonaws.com/prod
          const endpoint = modelId.split("sagemaker.")[1];

          // invoke the RESTFul endpoint with the payload
          const payload = {
            prompt: payloadInput,
            parameters: {
              max_new_tokens: 256,
              temperature: 0.1,
            },
          };

          const response = await fetch(`https://${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          const responseBody = await response.json();
          // extract the generated text from the response, the output payload should be in the format { "generated_text": "..." } using codellama model for now
          const finalResult = (responseBody as { generated_text: string }).generated_text;
  
          return finalResult;
        }

        const payload = {
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 4096,
          temperature: temperature,
          messages: [
            {
              role: "user",
              content: [{
                type: "text",
                text: payloadInput,
              }],
            },
          ],
        };

        const command = new InvokeModelCommand({
          // modelId: "anthropic.claude-3-5-sonnet-20240620-v1:0"
          modelId: modelId,
          contentType: "application/json",
          body: JSON.stringify(payload),
        });

        const apiResponse = await client.send(command);
        const decodedResponseBody = new TextDecoder().decode(apiResponse.body);
        const responseBody = JSON.parse(decodedResponseBody);
        return responseBody.content[0].text;
      } catch (error) {
        if (error instanceof Error && error.name === 'ThrottlingException') {
          throw error; // Allow retry for throttling errors
        }
        console.error('Error occurred while invoking the model', error);
        throw error; // Throw other errors without retry
      }
    };

    return exponentialBackoff(invokeWithRetry, maxRetries, initialDelay, invokeModel.name);
  }