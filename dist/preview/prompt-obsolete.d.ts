export declare class Prompt {
    private apiFunction;
    readonly id: string;
    private snippets;
    private docComments;
    private functionBody;
    private error;
    constructor(apiFunction: string, snippets?: string[]);
    assemble(): string;
    createTestSource(completion: string): string;
    private extractFunctionName;
    hasSnippets(): boolean;
    hasDocComments(): boolean;
    hasFunctionBody(): boolean;
    addSnippets(): Prompt;
    addDocComments(): Prompt;
    addFunctionBody(): Prompt;
    addError(error: string): Prompt;
}
