export class Inputs {
    // common
    systemMessage: string
    title: string
    description: string
    rawSummary: string
    shortSummary: string
    fileName: string
    filePath: string
    fileContent: string
    fileDiff: string
    patches: string
    diff: string
    commentChain: string
    comment: string
    languageName: string

    // code review
    hunkContent: string

    // unit test generation
    snippets: string[] = []
    docComments: string = ''
    functionBody: string = ''
    generatedUnitTestCodeExecutionError: string = ''
    generatedUnitTestCode: string = ''

    constructor(
        systemMessage = '',
        title = '',
        description = '',
        rawSummary = '',
        shortSummary = '',
        fileName = '',
        filePath = '',
        fileContent = '',
        fileDiff = '',
        patches = '',
        diff = '',
        commentChain = '',
        comment = '',
        languageName = '',

        // code review
        hunkContent = '',

        // unit test generation
        snippets: string[] = [],
        docComments: string = '',
        functionBody: string = '',
        generatedUnitTestCodeExecutionError: string = '',
        generatedUnitTestCode: string = ''
    ) {
        this.systemMessage = systemMessage
        this.title = title
        this.description = description
        this.rawSummary = rawSummary
        this.shortSummary = shortSummary
        this.fileName = fileName
        this.filePath = filePath
        this.fileContent = fileContent
        this.fileDiff = fileDiff
        this.functionBody = functionBody
        this.hunkContent = hunkContent
        this.patches = patches
        this.diff = diff
        this.commentChain = commentChain
        this.comment = comment
        this.languageName = languageName
    }
  
    clone(): Inputs {
      return new Inputs(
        this.systemMessage,
        this.title,
        this.description,
        this.rawSummary,
        this.shortSummary,
        this.fileName,
        this.filePath,
        this.fileContent,
        this.fileDiff,
        this.patches,
        this.diff,
        this.commentChain,
        this.comment,
        this.languageName,

        // code review
        this.hunkContent,

        // unit test generation
        this.snippets,
        this.docComments,
        this.functionBody,
        this.generatedUnitTestCodeExecutionError,
        this.generatedUnitTestCode
      )
    }
  
    render(content: string): string {
        if (!content) {
            return ''
        }
        if (this.title) {
            content = content.replace('{{title}}', this.title)
        }
        if (this.description) {
            content = content.replace('{{description}}', this.description)
        }
        if (this.fileName) {
          content = content.replace('{{fileName}}', this.fileName)
        }
        if (this.filePath) {
            content = content.replace('{{file_path}}', this.filePath)
        }
        if (this.fileContent) {
            content = content.replace('{{file_content}}', this.fileContent)
        }
        if (this.functionBody) {
            content = content.replace('{{function_to_be_tested}}', this.functionBody)
        }
        if (this.shortSummary) {
            content = content.replace('{{short_summary}}', this.shortSummary)
        }
        if (this.hunkContent) {
            content = content.replace('{{hunk_content}}', this.hunkContent)
        }
        if (this.languageName) {
            content = content.replace('{{language_name}}', this.languageName)
        }
        if (this.snippets) {
            content = content.replace('{{snippets}}', this.snippets.join('\n'))
        }
        if (this.docComments) {
            content = content.replace('{{doc_comments}}', this.docComments)
        }
        if (this.functionBody) {
            content = content.replace('{{function_body}}', this.functionBody)
        }
        if (this.generatedUnitTestCodeExecutionError) {
            content = content.replace('{{generated_unit_test_code_execution_error}}', this.generatedUnitTestCodeExecutionError)
        }
        if (this.generatedUnitTestCode) {
            content = content.replace('{{generated_unit_test_code}}', this.generatedUnitTestCode)
        }
        return content
    }
}

export class Prompts {
    readonly id: string;
    private snippets: string[];
    private docComments: string = '';
    private functionBody: string = '';
    refinedPrompt: string;
    summarize: string
    summarizeReleaseNotes: string

    constructor(private apiFunction: string = '', snippets: string[] = [], docComments: string = '', functionBody: string = '', summarize: string = '', summarizeReleaseNotes: string = '', refinedPrompt: string = '') {
      this.id = `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.snippets = snippets;
      this.refinedPrompt = refinedPrompt;
      this.summarize = summarize
      this.summarizeReleaseNotes = summarizeReleaseNotes
    }

    // Refer to https://google.github.io/eng-practices/review/reviewer/looking-for.html and https://google.github.io/eng-practices/review/reviewer/standard.html
    detailedReviewPrompt = 
`<Task Context>
You are an expert code reviewer tasked with reviewing a code change (CL) for a software project, review new hunks for substantive issues using provided context and respond with comments if necessary. Your primary goal is to ensure that the overall code health of the system is improving while allowing developers to make progress. Your feedback should be constructive, educational, and focused on the most important issues.
</Task Context>

<Tone Context>
Maintain a constructive and educational tone. Be thorough but not overly pedantic. Remember that the goal is continuous improvement, not perfection.
</Tone Context>

<GitHub PR context>
GitHub PR Title:
{{title}}

GitHub PR Description:
{{description}}

File name:
{{fileName}}

Summary of changes:
{{short_summary}}

Hunk content:
{{hunk_content}}
</GitHub PR context>

<Detailed Task Description>
<Input and Output>
Input: hunks content with hunk headers. Lines starting with '+' are additions, and lines starting with '-' are removals. Hunks represent incomplete code fragments with sample content shown below.
@@ -1,3 +1,2 @@
- This is the original line 1.
- This is the original line 2.
+ This is the new line 1.
+ This is an unchanged line.
@@ is the hunk header that shows where the changes are and how many lines are changed. In this case, it indicates that the changes start at line 1 of the old file and affect 3 lines, and start at line 1 of the new file and affect 2 lines
Additional Context: PR title, description, summaries and comment chains.

Output: Review the input following the <Review Guidelines>, and output the review comments in the following format:
- The review comment consists of: one sentence provide specific actionable feedback on the code change with bolded markdown text, and explanation of the feedback with exact line number ranges in new hunks in markdown format. Start and end line numbers must be within the same hunk. For single-line comments, start=end line number.
- Use fenced code blocks using the relevant language identifier where applicable.
- Don't annotate code snippets with line numbers. Format and indent code correctly.
- Do not use \`suggestion\` code blocks.
- XML tag must not be outputted.
- For fixes, use \`diff\` code blocks, marking changes with \`+\` or \`-\`. The line number range for comments with fix snippets must exactly match the range to replace in the new hunk.
- If there are no issues found or simple enough on a line range, you MUST respond with the text \`Looks Good To Me!\` for that line range in the review section only, no more output otherwise.
- Limit the total response within 100 words, the output language should be {{language_name}}.
- Refer to the <Examples> below for the exact format of the output.
</Input and Output>

<Review Guidelines>
- Do NOT provide general feedback, summaries, explanations of changes, or praises for making good additions. 
- Focus solely on offering specific, objective insights based on the given context and refrain from making broad comments about potential impacts on the system or question intentions behind the changes.
- Focus on the most important issues that affect code health and functionality.
- Balance the need for improvement with the need to make progress.
- Be specific in your feedback, referencing line numbers when applicable.
- Explain the reasoning behind your suggestions, especially for design-related feedback.
- If suggesting an alternative approach, briefly explain its benefits.
- Acknowledge good practices and improvements in the code.
</Review Guidelines>
</Detailed Task Description>

<Examples>
<Input>
--- example.js
+++ example.js
@@ -7,9 +7,13 @@ const _ = require("underscore");
  */

function exampleCall({ nameObj } = {}) {
-  const retObj = { ..._.omit(nameObj, "firstName", "lastName"), firstName: nameObj.firstName, lastName: nameObj.lastName };
+  const retObj = {
+    ..._.omit(nameObj, "firstName", "lastName"),
+    firstName: nameObj.firstName,
+    lastName: nameObj.lastName
+  };

-  if (!nameObj.firstName && !nameObj.lastName) {
+  if (!nameObj || (!nameObj.firstName && !nameObj.lastName)) {
     retObj.anObjectHasNoName = true;
   }
</Input>

<Output>
7-13:
Looks Good To Me! The code has been reformatted to improve readability. This change looks good and follows best practices for object formatting.

14-14:
Looks Good To Me! The condition has been updated to include a null check for <nameObj>. This is a good defensive programming practice.
</Output>

<Input>
--- another_example.js
+++ another_example.js
@@ -13,7 +13,7 @@ function exampleCall({ nameObj } = {}) {
     lastName: nameObj.lastName
   };
 
-  if (!nameObj || (!nameObj.firstName && !nameObj.lastName)) {
+  if (!nameObj.firstName && !nameObj.lastName) {
     retObj.anObjectHasNoName = true;
   }
</Input>

<Output>
13-13:
\n
**Consider adding null check for \`nameObj\`.**
\n
The condition has removed the null check for \`nameObj\`. This change could potentially lead to null pointer exceptions if \`nameObj\` is undefined or null. Consider to add the null check to ensure defensive programming practices.

\`\`\`diff
-  if (!nameObj || (!nameObj.firstName && !nameObj.lastName)) {
+  if (!nameObj.firstName && !nameObj.lastName) {
\`\`\`

</Output>
<Examples>
`
    // TODO: add concise review prompt, use the same format as detailed review prompt for now
    conciseReviewPrompt = this.detailedReviewPrompt


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

    preProcessUnitTestGenerationPrompt = 
`
TODO
`

    unitTestGenerationPrompt = 
`
<Task Context>
You are an expert TypeScript developer specializing in unit testing. Your task is to analyze the following TypeScript code and generate comprehensive unit tests using Jest.
</Task Context>

<Code Context>
// File name:
{{fileName}}

// File path:
File path:
{{file_path}}

// Whole file content:
{{file_content}}

Function to be tested:
{{function_to_be_tested}}
</Code Context>

<Detailed Task Description>
<Input and Output>
Input: Code context including file name, file path, whole file content and function to be tested.
Output: Jest unit test code, with fenced code blocks using the relevant language identifier where applicable, do not include any explanatory text outside of the fenced code blocks.
\`\`\`typescript
<Generated Unit Test Code>
\`\`\`
</Input and Output>

<Generation Guidelines>
- Carefully read and understand the provided TypeScript code.
- Ensure your tests are comprehensive and cover various scenarios, including edge cases.
- Use clear and descriptive test names.
- Include comments in your test code to explain the purpose of each test.
- Follow TypeScript and Jest best practices.
- Import internal dependencies and mock external modules in absolute path using file path, e.g. import { calculateDiscount } from 'src/example'.
- Use jest.mock() to mock external dependencies like fs, path, and child_process.
- Include setup and teardown code (beforeEach, afterEach) where necessary.
- Use appropriate Jest matchers (e.g., toHaveBeenCalledWith, toThrow) for precise assertions.
- Consider using test.each for parameterized tests when appropriate.
- Ensure that async functions are properly tested using async/await syntax.
</Generation Guidelines>

<Example>
<Input>
// File name
example.ts

// File path
src/example.ts

// Whole file content
export function otherFunction() {
  return 'otherFunction'
}

export function calculateDiscount(price: number, discountPercentage: number): number {
  if (price < 0 || discountPercentage < 0 || discountPercentage > 100) {
    throw new Error('Invalid input parameters');
  }
  
  const discountAmount = price * (discountPercentage / 100);
  return Number((price - discountAmount).toFixed(2));
}

// Function to be tested
export function calculateDiscount(price: number, discountPercentage: number): number {
  if (price < 0 || discountPercentage < 0 || discountPercentage > 100) {
    throw new Error('Invalid input parameters');
  }
  
  const discountAmount = price * (discountPercentage / 100);
  return Number((price - discountAmount).toFixed(2));
}
</Input>

<Output>
\`\`\`typescript
import { calculateDiscount } from 'src/example'

describe('calculateDiscount', () => {
  it('should return the correct discount', () => {
    expect(calculateDiscount(100, 10)).toBe(90);
  });
});
\`\`\`
</Output>
</Example>
`

    unitTestGenerationRefinedPrompt = 
`
<Task Context>
You are an expert TypeScript developer specializing in unit testing. Your task is to analyze the following TypeScript code, generated unit test code and error in the test case execution, then refine the generated unit test code accordingly.
</Task Context>

<Code Context>
// File name:
{{fileName}}

// File path:  
{{file_path}}

// Whole file content:
{{file_content}}

// Function to be tested:
{{function_to_be_tested}}

// Generated unit test code:
{{generated_unit_test_code}}

// Error in the unit test execution:
{{generated_unit_test_code_execution_error}}
</Code Context>

<Detailed Task Description>
<Input and Output>
Input: Code context including file name, file path, whole file content and function to be tested, generated unit test code and error in the test case execution.
Output: Refined unit test code, with fenced code blocks using the relevant language identifier where applicable, do not include any explanatory text outside of the fenced code blocks.
\`\`\`typescript
<Refined Unit Test Code>
\`\`\`
</Input and Output>

<Generation Guidelines>
- Carefully read and understand the provided TypeScript code, generated unit test code and error in the test case execution.
- Fix the error in the test case execution and refine the generated unit test code accordingly.
- Ensure that the refined unit test code is correct and comprehensive.
- Use the absolute path and avoid using relative path e.g. import { calculateDiscount } from 'src/example' instead of import { calculateDiscount } from './example' or import { calculateDiscount } from '../example' or import { calculateDiscount } from '../../example'.
</Generation Guidelines>

<Example>
<Input>
// File name
example.ts

// File path
src/example.ts

// Whole file content
export function otherFunction() {
  return 'otherFunction'
}

export function calculateDiscount(price: number, discountPercentage: number): number {
  if (price < 0 || discountPercentage < 0 || discountPercentage > 100) {
    throw new Error('Invalid input parameters');
  }
  
  const discountAmount = price * (discountPercentage / 100);
  return Number((price - discountAmount).toFixed(2));
}

// Function to be tested
export function calculateDiscount(price: number, discountPercentage: number): number {
  if (price < 0 || discountPercentage < 0 || discountPercentage > 100) {
    throw new Error('Invalid input parameters');
  }
  
  const discountAmount = price * (discountPercentage / 100);
  return Number((price - discountAmount).toFixed(2));
}

// Generated unit test code
import { calculateDiscount } from 'src/example'
describe('calculateDiscount', () => {
  it('should return the correct discount', () => {
    expect(calculateDiscount(100, 10)).toBe(90);
  });
});

// Error in the unit test execution
Error: expect(received).toBe(expected) // Object.is equality

Expected: 90
Received: 90.00

  4 |   it('should return the correct discount', () => {
  5 |     expect(calculateDiscount(100, 10)).toBe(90);
> 6 |   });
    |   ^
  7 | });

</Input>

<Output>
\`\`\`typescript
import { calculateDiscount } from 'src/example'
describe('calculateDiscount', () => {
  it('should return the correct discount', () => {
    expect(calculateDiscount(100, 10)).toBeCloseTo(90, 2);
  });
});
\`\`\`
</Output>
</Example>
`

    renderDetailedReviewPrompt(inputs: Inputs): string {
      return inputs.render(this.detailedReviewPrompt)
    }

    renderConciseReviewPrompt(inputs: Inputs): string {
      return inputs.render(this.conciseReviewPrompt)
    }

    // TODO: refine the multiple prompts template
    renderUnitTestGenerationPrompt(inputs: Inputs): string {
      return inputs.render(this.unitTestGenerationPrompt)
    }

    renderUnitTestGenerationRefinedPrompt(inputs: Inputs): string {
      return inputs.render(this.unitTestGenerationRefinedPrompt)
    }
}