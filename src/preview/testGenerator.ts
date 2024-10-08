import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { context } from "@actions/github";
import { getOctokit } from "@actions/github";
import { shouldExcludeFile } from "../utils";
import { PullRequest } from "../utils";
import { ICompletionModel, LanguageModel } from "./languageModel";
import { TestValidator } from "./testValidator";
import { ITestResultCollector, BaseTestResultCollector } from "./resultCollector";
import { Inputs, Prompts } from "../prompts";
import { SnippetMap } from "./snippetMap";

import { ICoverageSummary } from './testValidator';
import { ITestInfo } from "./resultCollector";
export class TestGenerator {
    private worklist: Prompts[] = [];

    constructor(
        private temperatures: number[],
        private snippetMap: SnippetMap,
        private model: ICompletionModel,
        private validator: TestValidator,
        private collector: ITestResultCollector
    ) {}

    async generateAndValidateTests(fileMeta: {
        fileName: string,
        filePath: string,
        fileContent: string,
        rootDir: string
    }, snippets: string[]): Promise<{ generatedTests: string[], coverageSummary: ICoverageSummary, testResults: Array<ITestInfo & { outcome: { status: string; error?: string } }> }> {
        const inputs: Inputs = new Inputs()
        inputs.fileName = fileMeta.fileName
        inputs.fileContent = fileMeta.fileContent
        inputs.filePath = fileMeta.filePath

        const functions = this.extractFunctions(fileMeta.fileContent);
        let generatedTests: string[] = [];

        for (const func of functions) {
            const initialPrompt: Prompts = new Prompts()
            inputs.functionBody = func

            for (const temperature of this.temperatures) {
                let generatedPassingTests = false;
                // Push initial prompt to worklist
                this.worklist.push(initialPrompt);
                let attempts = 0;
                const maxAttempts = 5; // Limit the number of attempts per temperature

                while (this.worklist.length > 0 && attempts < maxAttempts) {
                    const prompt = this.worklist.pop()!;
                    
                    if (this.collector.hasPrompt(prompt)) {
                        continue;
                    }
                    // if refinedPrompt is not empty means this prompt has been refined before, we don't need to render it again
                    const promptString = prompt.refinedPrompt === '' ? prompt.renderUnitTestGenerationPrompt(inputs) : prompt.refinedPrompt
                    const completions = await this.model.getCompletions(promptString, temperature)

                    // record the prompt info to avoid duplicate processing for the same prompt
                    this.collector.recordPromptInfo(prompt, completions.length);
                    
                    // TODO: There is only one completion for now, try to refactor the getCompletions execute multiple times
                    const completionArray = Array.isArray(completions) ? completions : [completions];
                    for (const completion of completionArray) {
                        const testInfo = this.validateCompletion(prompt, completion, fileMeta.rootDir);
                        if (testInfo.outcome.status === "PASSED") {
                            generatedPassingTests = true;
                            this.collector.recordTestResult(testInfo);
                            generatedTests.push(testInfo.testSource);
                            break;
                        } else if (testInfo.outcome.status === "FAILED") {
                            // Re-render the prompt with the error, simple promptRefiner implementation
                            inputs.generatedUnitTestCodeExecutionError = testInfo.outcome.error
                            inputs.generatedUnitTestCode = testInfo.testSource
                            const refinedPrompt: Prompts = new Prompts()
                            refinedPrompt.refinedPrompt = prompt.renderUnitTestGenerationRefinedPrompt(inputs)
                            this.worklist.push(refinedPrompt);
                            console.log('Attempt: ', attempts, '\nRefined prompt: ', refinedPrompt.refinedPrompt)
                        }
                        this.collector.recordTestResult(testInfo);
                    }
                    if (generatedPassingTests) {
                        break;
                    }
                    attempts++;
                }
                if (generatedPassingTests) {
                    break;
                }
            }
        }
        const coverageSummary = this.validator.getCoverageSummary();
        console.log('Coverage summary: ', coverageSummary);
        this.collector.recordCoverageInfo(coverageSummary);
        return {
            generatedTests,
            coverageSummary,
            testResults: this.collector.getTestResults()
        };
    }

    private validateCompletion(prompt: Prompts, completion: string, rootDir: string): any {
        const testSource = this.parseExecutableCode(completion)
        const testInfo = {
            testName: `test_${Date.now()}`,
            testSource,
            prompt,
            rootDir
        };

        this.collector.recordTestInfo(testInfo);
        if (completion.trim() === "") {
            return { ...testInfo, outcome: { status: "FAILED", error: "Empty completion" } };
        }

        const outcome = this.validator.validateTest(testInfo.testName, testInfo.testSource, rootDir);
        console.log('Outcome for the testSource:\n', outcome, '\n\nTest source:\n', testInfo.testSource)
        return { ...testInfo, outcome }
    }

    private parseExecutableCode(completion: string): string {
        /**
         * Input will be in the format below according to the prompt in renderUnitTestGenerationPrompt:
         * 
         * ```typescript
         * <Generated Unit Test Code>
         * ```
         * 
         * Extract the executable code from the Input directly
        **/
        try {
            const codeBlockRegex = /```(?:javascript|typescript)?\s*([\s\S]*?)```/g;
            const match = codeBlockRegex.exec(completion);
            if (match && match[1]) {
                return match[1].trim();
            }
            // throw new Error('No code block found in the completion');
            console.warn('No code block found in the completion, returning the original completion instead');
            return completion;
        } catch (error) {
            console.log('Error parsing completion: ', error)
            throw error;
        }
    }

    // TODO: Use a proper TypeScript parser like typescript-estree.
    private extractFunctions(fileContent: string): string[] {
        const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+\w+\s*\([^)]*\)\s*(?::\s*\w+)?\s*{[^}]*}/g;
        return fileContent.match(functionRegex) || [];
    }
}

async function removeDuplicateImports(allTestCases: { fileName: string, testSource: string }[]): Promise<{ fileName: string, testSource: string }[]> {
    /* 
    Remove the duplicate import code since the unit test cases are first generated based on per function basis of each file, and duplicate import, e.g. import { add } from './sample' will be generated for each function
    allTestCases:  
    [
        {
            fileName: 'sample.ts',
            testSource: "import { add } from 'test/sample';\n" 
            ...
            "import { add } from 'test/sample';\n"
            ...
        }
    ]
    */
    return allTestCases.map(testCase => {
        const lines = testCase.testSource.split('\n');
        const uniqueImports = new Set<string>();
        const filteredLines = lines.filter(line => {
            if (line.trim().startsWith('import ')) {
                if (uniqueImports.has(line)) {
                    return false; // Skip duplicate import
                }
                uniqueImports.add(line);
            }
            return true; // Keep non-import lines and unique imports
        });
        return {
            fileName: testCase.fileName,
            testSource: filteredLines.join('\n')
        };
    });
}

export async function generateUnitTestsSuite(
    client: BedrockRuntimeClient,
    modelId: string,
    octokit: ReturnType<typeof getOctokit>,
    repo: { owner: string, repo: string },
    unitTestSourceFolder: string
): Promise<void> {
    const pullRequest = context.payload.pull_request as PullRequest;
    const branchName = pullRequest.head.ref;
    let allTestCases: { fileName: string, testSource: string }[] = [];
    let allCoverageSummaries: ICoverageSummary[] = [];
    let allTestResults: Array<ITestInfo & { outcome: { status: string; error?: string } }> = [];

    // Check if the "auto-unit-test-baseline" tag exists
    const { data: tags } = await octokit.rest.repos.listTags({
        ...repo,
        per_page: 100,
    });
    const baselineTagExists = tags.some(tag => tag.name === 'auto-unit-test-baseline');

    if (!baselineTagExists) {
        console.log('Baseline tag does not exist, generating tests for all .ts files in the specified folder');
        // Generate tests for all .ts files in the specified folder
        try {
            const { data: files } = await octokit.rest.repos.getContent({
                ...repo,
                path: unitTestSourceFolder,
            });
            if (Array.isArray(files)) {
                for (const file of files) {
                    // console.log(`File ${file.name} will be excluded for unit test generation: ${shouldExcludeFile(file.name, excludePatterns)}`);
                    // TODO, currently we hard code the suffix should be .ts, this should be configurable using excludePatterns in the future
                    if (file.type === 'file' && file.name.endsWith('.ts')) {
                        const { data: content } = await octokit.rest.repos.getContent({
                            ...repo,
                            path: file.path,
                        });
                        if ('content' in content && typeof content.content === 'string') {
                            const decodedContent = Buffer.from(content.content, 'base64').toString('utf8');
                            const fileMeta = {
                                fileName: file.name,
                                filePath: file.path,
                                fileContent: decodedContent,
                                rootDir: unitTestSourceFolder
                            }
                            const { generatedTests, coverageSummary, testResults } = await generateTestCasesForFile(client, modelId, fileMeta);
                            allTestCases.push({ fileName: file.name, testSource: generatedTests.join('\n\n') });
                            allCoverageSummaries.push(coverageSummary);
                            allTestResults = allTestResults.concat(testResults);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Failed to list files in the specified folder:', error);
            throw error;
        }

        // Create the baseline tag
        try {
            await octokit.rest.git.createRef({
                ...repo,
                ref: 'refs/tags/auto-unit-test-baseline',
                sha: pullRequest.head.sha,
            });
            console.log('Tag auto-unit-test-baseline created successfully');
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds
        } catch (error) {
            console.error('Failed to create tag:', error);
        }
    } else {
        console.log('Baseline tag exists, generating tests for changed .ts files in the PR');
        // Generate tests only for files changed in the PR
        const { data: changedFiles } = await octokit.rest.pulls.listFiles({
            ...repo,
            pull_number: pullRequest.number,
        });

        for (const file of changedFiles) {
            if (file.filename.startsWith(unitTestSourceFolder) && file.filename.endsWith('.ts')) {
                const { data: content } = await octokit.rest.repos.getContent({
                    ...repo,
                    path: file.filename,
                    ref: pullRequest.head.sha,
                });
                if ('content' in content && typeof content.content === 'string') {
                    const decodedContent = Buffer.from(content.content, 'base64').toString('utf8');
                    const fileMeta = {
                        fileName: file.filename,
                        filePath: file.filename,
                        fileContent: decodedContent,
                        rootDir: unitTestSourceFolder
                    }
                    const { generatedTests, coverageSummary, testResults } = await generateTestCasesForFile(client, modelId, fileMeta);
                    allTestCases.push({ fileName: fileMeta.fileName, testSource: generatedTests.join('\n\n') });
                    allCoverageSummaries.push(coverageSummary);
                    allTestResults = allTestResults.concat(testResults);
                }
            }
        }
    }

    if (allTestCases.length === 0) {
        console.warn('No test cases generated. Returning empty array.');
        throw new Error('No test cases generated. Returning empty array.');
    }

    allTestCases = await removeDuplicateImports(allTestCases);
    // console.log('Debugging allTestCases after removing duplicate imports: ', allTestCases);

    if (pullRequest) {
        try {
            if (!branchName) {
                throw new Error('Unable to determine the branch name');
            }

            let readmeContent = "# Auto-Generated Unit Tests\n\n";
            readmeContent += "This document provides an overview of the automatically generated unit tests for this project.\n\n";
            readmeContent += "## Generated Test Suites\n\n";

            // Create or update test files for each source file
            for (const testCase of allTestCases) {
                const sourceFileName = testCase.fileName;
                const testFileName = sourceFileName.replace(/\.ts$/, '.test.ts');
                const testFilePath = `test/${testFileName}`;

                // Check if the file already exists
                let fileSha: string | undefined;
                try {
                    const { data: existingFile } = await octokit.rest.repos.getContent({
                        ...repo,
                        path: testFilePath,
                        ref: branchName,
                    });
                    if ('sha' in existingFile) {
                        fileSha = existingFile.sha;
                    }
                } catch (error) {
                    console.log(`File ${testFilePath} does not exist in the repository. Creating it.`);
                }

                await octokit.rest.repos.createOrUpdateFileContents({
                    ...repo,
                    path: testFilePath,
                    message: `Add or update unit tests for ${sourceFileName}`,
                    content: Buffer.from(testCase.testSource).toString('base64'),
                    branch: branchName,
                    sha: fileSha,
                });

                console.log(`Unit tests file ${testFilePath} created or updated successfully.`);

                // Add information to README content
                readmeContent += `- **${testFileName}**: Tests for \`${sourceFileName}\`\n`;
                readmeContent += `  - Location: \`${testFilePath}\`\n`;
                readmeContent += `  - Source file: \`${unitTestSourceFolder}/${sourceFileName}\`\n\n`;
            }

            // Add test coverage information
            readmeContent += "## Test Coverage\n\n";
            readmeContent += "The following test coverage was achieved during the pre-flight phase:\n\n";
            readmeContent += "```\n";
            readmeContent += JSON.stringify(aggregateCoverageSummaries(allCoverageSummaries), null, 2);
            readmeContent += "\n```\n\n";

            // Add test results summary
            readmeContent += "## Test Results Summary\n\n";
            const passedTests = allTestResults.filter(result => result.outcome.status === "PASSED").length;
            const failedTests = allTestResults.filter(result => result.outcome.status === "FAILED").length;
            readmeContent += `Total tests: ${allTestResults.length}\n`;
            readmeContent += `Passed tests: ${passedTests}\n`;
            readmeContent += `Failed tests: ${failedTests}\n\n`;

            // Add instructions for manual execution
            readmeContent += "## Running Tests Manually\n\n";
            readmeContent += "To run these unit tests manually, follow these steps:\n\n";
            readmeContent += "1. Ensure you have Node.js and npm installed on your system.\n";
            readmeContent += "2. Navigate to the project root directory in your terminal.\n";
            readmeContent += "3. Install the necessary dependencies by running:\n";
            readmeContent += "   ```\n   npm install\n   ```\n";
            readmeContent += "4. Run the tests using the following command:\n";
            readmeContent += "   ```\n   npm test\n   ```\n";
            readmeContent += "\nThis will execute all the unit tests in the `test` directory.\n";

            // Create or update the README file
            const readmeFilePath = 'test/AUTO_GENERATED_TESTS_README.md';
            let readmeFileSha: string | undefined;
            try {
                const { data: existingReadme } = await octokit.rest.repos.getContent({
                    ...repo,
                    path: readmeFilePath,
                    ref: branchName,
                });
                if ('sha' in existingReadme) {
                    readmeFileSha = existingReadme.sha;
                }
            } catch (error) {
                console.log(`README file ${readmeFilePath} does not exist in the repository. Creating it.`);
            }

            await octokit.rest.repos.createOrUpdateFileContents({
                ...repo,
                path: readmeFilePath,
                message: 'Add or update README for auto-generated unit tests',
                content: Buffer.from(readmeContent).toString('base64'),
                branch: branchName,
                sha: readmeFileSha,
            });

            console.log(`README file ${readmeFilePath} created or updated successfully.`);

        } catch (error) {
            console.error('Error occurred while pushing the changes to the PR branch', error);
            throw error;
        }
    }
}

async function generateTestCasesForFile(
    client: BedrockRuntimeClient,
    modelId: string,
    fileMeta: {
        fileName: string,
        filePath: string,
        fileContent: string,
        rootDir: string
    }
): Promise<{ generatedTests: string[], coverageSummary: ICoverageSummary, testResults: Array<ITestInfo & { outcome: { status: string; error?: string } }> }> {
    const temperatures = [0.2, 0.5, 0.8, 1.0];
    const snippetMap = new SnippetMap();
    const model = new LanguageModel(client, modelId);
    const validator = new TestValidator();
    const collector = new BaseTestResultCollector();

    const testGenerator = new TestGenerator(
        temperatures,
        snippetMap,
        model,
        validator,
        collector
    );

    return await testGenerator.generateAndValidateTests(fileMeta, []); // Assuming no snippets for now
}

function aggregateCoverageSummaries(summaries: ICoverageSummary[]): ICoverageSummary {
    const aggregate: ICoverageSummary = {
        lines: { total: 0, covered: 0, skipped: 0, pct: 0 },
        statements: { total: 0, covered: 0, skipped: 0, pct: 0 },
        functions: { total: 0, covered: 0, skipped: 0, pct: 0 },
        branches: { total: 0, covered: 0, skipped: 0, pct: 0 }
    };

    for (const summary of summaries) {
        for (const key of ['lines', 'statements', 'functions', 'branches'] as const) {
            aggregate[key].total += summary[key].total;
            aggregate[key].covered += summary[key].covered;
            aggregate[key].skipped += summary[key].skipped;
        }
    }

    for (const key of ['lines', 'statements', 'functions', 'branches'] as const) {
        aggregate[key].pct = aggregate[key].total === 0 ? 100 : (aggregate[key].covered / aggregate[key].total) * 100;
    }

    return aggregate;
}