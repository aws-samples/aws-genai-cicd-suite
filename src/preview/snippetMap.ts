export class SnippetMap {
    private snippets: Map<string, string[]> = new Map();

    addSnippet(functionName: string, snippet: string): void {
        if (!this.snippets.has(functionName)) {
            this.snippets.set(functionName, []);
        }
        this.snippets.get(functionName)!.push(snippet);
    }

    getSnippets(functionName: string): string[] {
        return this.snippets.get(functionName) || [];
    }

    hasSnippets(functionName: string): boolean {
        return this.snippets.has(functionName) && this.snippets.get(functionName)!.length > 0;
    }
}