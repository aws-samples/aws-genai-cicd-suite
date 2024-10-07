import { Prompt } from './prompt-obsolete';

export class PromptRefiner {
    static refinePrompt(prompt: Prompt, error: string): Prompt[] {
        const refinedPrompts: Prompt[] = [];

        // SnippetIncluder
        if (!prompt.hasSnippets()) {
            refinedPrompts.push(prompt.addSnippets());
        }

        // RetryWithError
        refinedPrompts.push(prompt.addError(error));

        // DocCommentIncluder
        if (!prompt.hasDocComments()) {
            refinedPrompts.push(prompt.addDocComments());
        }

        // FunctionBodyIncluder
        if (!prompt.hasFunctionBody()) {
            refinedPrompts.push(prompt.addFunctionBody());
        }

        return refinedPrompts;
    }
}