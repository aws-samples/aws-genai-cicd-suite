export class Prompt {
    readonly id: string;
    private snippets: string[];
    private docComments: string = '';
    private functionBody: string = '';
    private error: string = '';

    constructor(private apiFunction: string, snippets: string[] = []) {
        this.id = `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.snippets = snippets;
    }

    assemble(): string {
        let assembledPrompt = `Write a unit test for the following API function:\n\n${this.apiFunction}\n\n`;
        
        if (this.snippets.length > 0) {
            assembledPrompt += "Usage examples:\n" + this.snippets.join("\n") + "\n\n";
        }

        if (this.docComments) {
            assembledPrompt += "Function documentation:\n" + this.docComments + "\n\n";
        }

        if (this.functionBody) {
            assembledPrompt += "Function body:\n" + this.functionBody + "\n\n";
        }

        if (this.error) {
            assembledPrompt += "Previous error:\n" + this.error + "\n\nPlease address this error in the new test.\n\n";
        }

        assembledPrompt += "Generate a complete, runnable unit test for this function:";

        return assembledPrompt;
    }

    createTestSource(completion: string): string {
        return `
const assert = require('assert');
const { ${this.extractFunctionName(this.apiFunction)} } = require('../src/your-module');

describe('${this.extractFunctionName(this.apiFunction)} Tests', () => {
    ${completion}
});
`;
    }

    private extractFunctionName(apiFunction: string): string {
        const match = apiFunction.match(/function\s+(\w+)/);
        return match && match[1] ? match[1] : 'UnknownFunction';
    }

    hasSnippets(): boolean {
        return this.snippets.length > 0;
    }

    hasDocComments(): boolean {
        return this.docComments !== '';
    }

    hasFunctionBody(): boolean {
        return this.functionBody !== '';
    }

    addSnippets(): Prompt {
        // In a real implementation, you'd fetch snippets from somewhere
        const newSnippets = [...this.snippets, "const result = apiFunction(arg1, arg2);"];
        return new Prompt(this.apiFunction, newSnippets);
    }

    addDocComments(): Prompt {
        const newPrompt = new Prompt(this.apiFunction, this.snippets);
        newPrompt.docComments = "/** This function does something important */";
        return newPrompt;
    }

    addFunctionBody(): Prompt {
        const newPrompt = new Prompt(this.apiFunction, this.snippets);
        newPrompt.functionBody = "function body { /* implementation */ }";
        return newPrompt;
    }

    addError(error: string): Prompt {
        const newPrompt = new Prompt(this.apiFunction, this.snippets);
        newPrompt.error = error;
        return newPrompt;
    }
}