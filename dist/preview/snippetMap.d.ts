export declare class SnippetMap {
    private snippets;
    addSnippet(functionName: string, snippet: string): void;
    getSnippets(functionName: string): string[];
    hasSnippets(functionName: string): boolean;
}
