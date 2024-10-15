export enum FunctionType {
  LLMOnly,
  CodebaseAware,
  ExternalAPI
}

export class ActionTypeDeterminer {
  determineActionType(intention: string): FunctionType {
    // Simple mapping logic, can be expanded later
    if (intention.includes('generate') || intention.includes('summarize')) {
      return FunctionType.LLMOnly;
    } else if (intention.includes('review') || intention.includes('analyze')) {
      return FunctionType.CodebaseAware;
    } else {
      return FunctionType.ExternalAPI;
    }
  }
}
