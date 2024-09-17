import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export async function analyzeCoverage(testFilePath: string, sourceCode: string): Promise<{
    statements: number;
    branches: number;
    functions: number;
    lines: number;
}> {
    const coverageDir = path.join(__dirname, '..', 'coverage');
    if (!fs.existsSync(coverageDir)) {
        fs.mkdirSync(coverageDir, { recursive: true });
    }

    const sourceFilePath = path.join(__dirname, '..', 'temp_source.ts');
    fs.writeFileSync(sourceFilePath, sourceCode);

    try {
        execSync(`npx jest ${testFilePath} --coverage --coverageReporters="json-summary" --collectCoverageFrom=${sourceFilePath}`, {
            stdio: 'inherit',
            env: { ...process.env, NODE_ENV: 'test' },
        });

        const coverageSummary = JSON.parse(fs.readFileSync(path.join(coverageDir, 'coverage-summary.json'), 'utf-8'));
        const fileCoverage = coverageSummary[sourceFilePath];

        return {
            statements: fileCoverage.statements.pct,
            branches: fileCoverage.branches.pct,
            functions: fileCoverage.functions.pct,
            lines: fileCoverage.lines.pct,
        };
    } catch (error) {
        console.error('Error analyzing coverage:', error);
        return {
            statements: 0,
            branches: 0,
            functions: 0,
            lines: 0,
        };
    } finally {
        fs.unlinkSync(sourceFilePath);
    }
}