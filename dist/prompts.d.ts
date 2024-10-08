export declare class Inputs {
    systemMessage: string;
    title: string;
    description: string;
    rawSummary: string;
    shortSummary: string;
    fileName: string;
    filePath: string;
    fileContent: string;
    fileDiff: string;
    patches: string;
    diff: string;
    commentChain: string;
    comment: string;
    languageName: string;
    hunkContent: string;
    snippets: string[];
    docComments: string;
    functionBody: string;
    generatedUnitTestCodeExecutionError: string;
    generatedUnitTestCode: string;
    constructor(systemMessage?: string, title?: string, description?: string, rawSummary?: string, shortSummary?: string, fileName?: string, filePath?: string, fileContent?: string, fileDiff?: string, patches?: string, diff?: string, commentChain?: string, comment?: string, languageName?: string, hunkContent?: string, snippets?: string[], docComments?: string, functionBody?: string, generatedUnitTestCodeExecutionError?: string, generatedUnitTestCode?: string);
    clone(): Inputs;
    render(content: string): string;
}
export declare class Prompts {
    private apiFunction;
    readonly id: string;
    private snippets;
    private docComments;
    private functionBody;
    refinedPrompt: string;
    summarize: string;
    summarizeReleaseNotes: string;
    constructor(apiFunction?: string, snippets?: string[], docComments?: string, functionBody?: string, summarize?: string, summarizeReleaseNotes?: string, refinedPrompt?: string);
    detailedReviewPrompt: string;
    conciseReviewPrompt: string;
    /**
* Structured representation of a prompt we finally send to the model to generate test cases, which is a generation from another prompt.
*
* ```js
* let mocha = require('mocha');            // -+
* let assert = require('assert');          //  | Imports
* let pkg = require('pkg');                // -+
*
* // usage #1                              // -+
* ...                                      //  |
* // usage #2                              //  | Usage snippets
* ...                                      // -+
*
* // this does...                          // -+
* // @param foo                            //  |
* // @returns bar                          //  | Doc comment
* ...                                      // -+
*
* // fn(args)                              //    Signature of the function we're testing
* // function fn(args) {                   // -+
* //     ...                               //  | Function body (optional)
* // }                                     // -+
*
* describe('test pkg', function() {        //    Test suite header
*   it('test fn', function(done) {         //    Test case header
* ```
*
* The structured representation keeps track of these parts and provides methods
* to assemble them into a textual prompt and complete them into a test case.
*/
    preProcessUnitTestGenerationPrompt: string;
    unitTestGenerationPrompt: string;
    unitTestGenerationRefinedPrompt: string;
    renderDetailedReviewPrompt(inputs: Inputs): string;
    renderConciseReviewPrompt(inputs: Inputs): string;
    renderUnitTestGenerationPrompt(inputs: Inputs): string;
    renderUnitTestGenerationRefinedPrompt(inputs: Inputs): string;
}
