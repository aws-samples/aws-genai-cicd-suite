import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

export async function exponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  initialDelay: number
): Promise<T> {
  let retries = 0;
  while (true) {
    try {
      console.log(`Attempt ${retries + 1} of ${maxRetries + 1}`);
      const result = await fn();
      console.log(`Function executed successfully on attempt ${retries + 1}`);
      return result;
    } catch (error) {
      if (retries >= maxRetries) {
        console.error(`Max retries (${maxRetries}) reached. Throwing error.`);
        throw error;
      }
      const delay = initialDelay * Math.pow(2, retries);
      console.log(`Attempt ${retries + 1} failed. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      retries++;
    }
  }
}

export async function invokeModel(client: BedrockRuntimeClient, modelId: string, payloadInput: string): Promise<string> {
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

    return exponentialBackoff(invokeWithRetry, maxRetries, initialDelay);
  }