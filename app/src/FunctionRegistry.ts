import { FunctionType } from './ActionTypeDeterminer';

export interface RegisteredFunction {
  id: string;
  name: string;
  type: FunctionType;
  execute: (query: string, context: any) => Promise<any>;
}

export class FunctionRegistry {
  private functions: Map<string, RegisteredFunction> = new Map();

  registerFunction(func: RegisteredFunction): void {
    this.functions.set(func.id, func);
  }

  getFunction(id: string): RegisteredFunction | undefined {
    return this.functions.get(id);
  }

  listFunctions(type?: FunctionType): RegisteredFunction[] {
    if (type === undefined) {
      return Array.from(this.functions.values());
    }
    return Array.from(this.functions.values()).filter(func => func.type === type);
  }

  updateFunction(id: string, updates: Partial<RegisteredFunction>): void {
    const func = this.functions.get(id);
    if (func) {
      this.functions.set(id, { ...func, ...updates });
    }
  }

  deleteFunction(id: string): boolean {
    return this.functions.delete(id);
  }
}
