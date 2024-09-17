import * as ts from 'typescript';
import { TestCase } from './testUtils';

export async function validateTestCases(testCases: TestCase[], sourceCode: string): Promise<TestCase[]> {
    const validatedTestCases: TestCase[] = [];

    for (const testCase of testCases) {
        if (isValidTestCase(testCase, sourceCode)) {
            validatedTestCases.push(testCase);
        } else {
            console.warn(`Invalid test case: ${testCase.name}`);
        }
    }

    return validatedTestCases;
}

function isValidTestCase(testCase: TestCase, sourceCode: string): boolean {
    // Check if the test case has all required properties
    if (!testCase.name || !testCase.type || !testCase.code) {
        return false;
    }

    // Check if the test case type is valid
    if (!['direct', 'indirect', 'not-testable'].includes(testCase.type)) {
        return false;
    }

    // Parse the source code and test code
    const sourceFile = ts.createSourceFile('source.ts', sourceCode, ts.ScriptTarget.Latest, true);
    const testFile = ts.createSourceFile('test.ts', testCase.code, ts.ScriptTarget.Latest, true);

    // Check if the test code references functions or classes from the source code
    const sourceSymbols = extractSymbols(sourceFile);
    const testSymbols = extractSymbols(testFile);

    return testSymbols.some(symbol => sourceSymbols.includes(symbol));
}

function extractSymbols(sourceFile: ts.SourceFile): string[] {
    const symbols: string[] = [];

    function visit(node: ts.Node) {
        if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) {
            if (node.name) {
                symbols.push(node.name.text);
            }
        }
        ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return symbols;
}