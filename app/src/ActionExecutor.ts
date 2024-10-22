import { FunctionRegistry, RegisteredFunction } from './FunctionRegistry';
import { LargeLanguageModel } from './LargeLanguageModel';
import { ActionTypeDeterminer, FunctionType } from './ActionTypeDeterminer';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';

interface ExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  iterations: number;
}

export class ActionExecutor {
  private registry: FunctionRegistry;
  private llm: LargeLanguageModel;
  private actionTypeDeterminer: ActionTypeDeterminer;

  constructor(registry: FunctionRegistry, client: BedrockRuntimeClient, modelId: string) {
    this.registry = registry;
    this.llm = new LargeLanguageModel(client, modelId);
    this.actionTypeDeterminer = new ActionTypeDeterminer();
  }

  async execute(intention: string, query: string, context: any): Promise<ExecutionResult> {
    const actionType = this.actionTypeDeterminer.determineActionType(intention);
    const functions = this.registry.listFunctions(actionType);
    const selectedFunction = await this.selectFunction(functions, query, context);
    
    let result: any;
    let iterations = 0;
    const maxIterations = 3;

    do {
      try {
        result = await this.executeFunction(selectedFunction, query, context);
        const evaluation = await this.evaluateOutput(result, query, context);
        
        if (evaluation.isSatisfactory) {
          return { success: true, result, iterations };
        } else if (iterations < maxIterations) {
          context = { ...context, previousResult: result, feedback: evaluation.feedback };
        } else {
          return { success: false, error: "Max iterations reached without satisfactory result", iterations };
        }
      } catch (error) {
        const errorHandler = await this.determineErrorHandling(error, query, context);
        if (errorHandler.retry && iterations < maxIterations) {
          context = { ...context, error, errorFeedback: errorHandler.feedback };
        } else {
          return { success: false, error: errorHandler.message, iterations };
        }
      }
      iterations++;
    } while (iterations < maxIterations);

    return { success: false, error: "Unexpected error", iterations };
  }

  private async selectFunction(functions: RegisteredFunction[], query: string, context: any): Promise<RegisteredFunction> {
    // For now, just return the first function. This can be improved later.
    return functions[0];
  }

  private async executeFunction(func: RegisteredFunction, query: string, context: any): Promise<any> {
    return func.execute(query, context);
  }

  private async evaluateOutput(result: any, query: string, context: any): Promise<{ isSatisfactory: boolean, feedback?: string }> {
    // This is a placeholder. In a real implementation, you might use the LLM to evaluate the output.
    return { isSatisfactory: true };
  }

  private async determineErrorHandling(error: any, query: string, context: any): Promise<{ retry: boolean, feedback?: string, message: string }> {
    // This is a placeholder. In a real implementation, you might use the LLM to determine how to handle the error.
    return { retry: false, message: error.message || "An error occurred" };
  }
}
