import { Octokit } from '@octokit/rest';
import { getOctokit, context } from '@actions/github';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

// Check if GITHUB_APP_TOKEN is set
if (!process.env.GITHUB_APP_TOKEN) {
  console.error("Error: GITHUB_APP_TOKEN environment variable is not set");
  process.exit(1);
}

export const octokit = new Octokit({ auth: process.env.GITHUB_APP_TOKEN });

const bedrockClient = new BedrockRuntimeClient({ region: 'us-east-1' });
const modelId = 'anthropic.claude-3-sonnet-20240229-v1:0'; // Replace with your desired model ID
const unitTestPrompt = "Generate unit tests for the following code: {{SOURCE_CODE}}";

// invoke the function e.g. await generateUnitTestsPerFile(repository.full_name, issue.number.toString(), file.filename);
export async function generateUnitTestsPerFile(repoFullName: string, issueNumber: string, fileName: string): Promise<string | undefined> {
  try {
    const [owner, repo] = repoFullName.split('/');
    const { data: fileContent } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: fileName,
      ref: `pull/${issueNumber}/head`
    });

    if ('content' in fileContent && typeof fileContent.content === 'string') {
      const decodedContent = Buffer.from(fileContent.content, 'base64').toString('utf-8');
      const prompt = unitTestPrompt.replace('{{SOURCE_CODE}}', decodedContent);
      const payload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [{
              type: "text",
              text: prompt,
            }],
          },
        ],
      };

      const command = new InvokeModelCommand({
          modelId: modelId,
          contentType: "application/json",
          body: JSON.stringify(payload),
      });

      try {
        const apiResponse = await bedrockClient.send(command)
        if (apiResponse === undefined) {
          console.log('Request timed out, returning fake response');
          return "An error occurred while generating unit tests.";
        }
        const decodedResponseBody = new TextDecoder().decode(apiResponse.body);
        const responseBody = JSON.parse(decodedResponseBody);
        const finalResult = responseBody.content[0].text;
        return finalResult;
      } catch (error) {
        console.error('Error generating unit tests:', error);
        return "An error occurred while generating unit tests.";
      }
    }
  } catch (error) {
    console.error('Error generating unit tests:', error);
    return "An error occurred while generating unit tests.";
  }
}

export async function modularizeFunction(repoFullName: string, branch: string, filePath: string, line: number): Promise<string> {
  try {
    const [owner, repo] = repoFullName.split('/');
    const { data: fileContent } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: filePath,
      ref: branch
    });

    if ('content' in fileContent && typeof fileContent.content === 'string') {
      const decodedContent = Buffer.from(fileContent.content, 'base64').toString('utf-8');
      const lines = decodedContent.split('\n');
      // This is a simplified approach and should be replaced with more sophisticated logic
      const functionLines = lines.slice(line - 1);
      const modularizedFunction = `
// Modularized function
function modularizedFunction() {
  ${functionLines.join('\n  ')}
}

// Usage example
modularizedFunction();
`;
      return modularizedFunction;
    } else {
      return "Unable to modularize function: File content not available.";
    }
  } catch (error) {
    console.error('Error modularizing function:', error);
    return "An error occurred while modularizing the function.";
  }
}

export async function generateStats(repoFullName: string): Promise<string> {
  try {
    const [owner, repo] = repoFullName.split('/');

    // Fetch repository information
    const { data: repoData } = await octokit.rest.repos.get({ owner, repo });

    // Fetch commit statistics
    const { data: commitStats } = await octokit.rest.repos.getCommitActivityStats({ owner, repo });

    // Fetch language statistics
    const { data: languageStats } = await octokit.rest.repos.listLanguages({ owner, repo });

    // Calculate total lines of code (rough estimate)
    const totalLinesOfCode = Object.values(languageStats).reduce((sum, count) => sum + count, 0);

    // Count TODO comments (this is a simplified approach and may not catch all TODOs)
    const { data: searchResult } = await octokit.rest.search.code({
      q: `repo:${repoFullName} TODO`,
    });
    const todoCount = searchResult.total_count;

    // Generate the stats table
    const statsTable = `
| Statistic                    | Value         |
|------------------------------|---------------|
| Number of Contributors       | ${repoData.subscribers_count} |
| Total Lines of Code (est.)   | ${totalLinesOfCode} |
| Open Issues                  | ${repoData.open_issues_count} |
| Forks                        | ${repoData.forks_count} |
| Stargazers                   | ${repoData.stargazers_count} |
| Number of \`TODO\` Comments    | ${todoCount} |
| Primary Language             | ${repoData.language || 'N/A'} |
| Created At                   | ${new Date(repoData.created_at).toLocaleDateString()} |
| Last Updated                 | ${new Date(repoData.updated_at).toLocaleDateString()} |
`;

    return `
<!-- This is an auto-generated reply by IBTBot -->
> [!TIP]
> For best results, initiate chat on the files or code changes.

Here are some interesting statistics about the repository, presented in a table format:

${statsTable}

These stats provide an overview of the repository's activity, codebase, and community engagement. If you need further details or additional statistics, feel free to ask!
`;
  } catch (error) {
    console.error('Error generating stats:', error);
    return 'An error occurred while generating repository statistics.';
  }
}

export async function findConsoleLogStatements(repoFullName: string): Promise<string> {
  try {
    const [owner, repo] = repoFullName.split('/');

    // Get the default branch
    const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
    const defaultBranch = repoData.default_branch;

    // Search for console.log statements in the repository
    const { data: searchResult } = await octokit.rest.search.code({
      q: `repo:${repoFullName} console.log`,
      per_page: 100 // Adjust this value based on your needs
    });

    if (searchResult.total_count === 0) {
      return "No console.log statements found in the repository.";
    }

    let consoleLogStatements = "Found console.log statements:\n\n";

    for (const item of searchResult.items) {
      try {
        const { data: fileContent } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: item.path,
          ref: defaultBranch // Use the default branch instead of a specific commit SHA
        });

        if ('content' in fileContent && typeof fileContent.content === 'string') {
          const decodedContent = Buffer.from(fileContent.content, 'base64').toString('utf-8');
          const lines = decodedContent.split('\n');
          const consoleLogLines = lines.filter(line => line.includes('console.log'));

          consoleLogStatements += `File: ${item.path}\n`;
          consoleLogLines.forEach(line => {
            consoleLogStatements += `${line.trim()}\n`;
          });
          consoleLogStatements += '\n';
        }
      } catch (contentError) {
        console.error(`Error fetching content for ${item.path}:`, contentError);
        consoleLogStatements += `Unable to fetch content for ${item.path}\n\n`;
      }
    }

    return consoleLogStatements;
  } catch (error) {
    console.error('Error finding console.log statements:', error);
    return 'An error occurred while searching for console.log statements.';
  }
}

export async function generateClassDiagram(repoFullName: string, packagePath: string): Promise<string> {
  const [owner, repo] = repoFullName.split('/');
  console.log('Generating class diagram for repo:', repoFullName, 'and package path:', packagePath);

  async function searchDirectory(path: string): Promise<string[]> {
    try {
      const { data: contents } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: path,
      });

      let classNames: string[] = [];

      if (Array.isArray(contents)) {
        for (const item of contents) {
          if (item.type === 'file' && item.name.endsWith('.ts')) {
            const { data: fileContent } = await octokit.rest.repos.getContent({
              owner,
              repo,
              path: item.path
            });

            if ('content' in fileContent && typeof fileContent.content === 'string') {
              const decodedContent = Buffer.from(fileContent.content, 'base64').toString('utf-8');
              const classMatches = decodedContent.match(/class\s+(\w+)/g);
              if (classMatches) {
                classNames = classNames.concat(classMatches.map(match => match.split(' ')[1]));
              }
            }
          } else if (item.type === 'dir') {
            classNames = classNames.concat(await searchDirectory(item.path));
          }
        }
      }

      return classNames;
    } catch (error) {
      console.error(`Error searching directory ${path}:`, error);
      return [];
    }
  }

  try {
    let classNames = await searchDirectory(packagePath);

    // If no classes found in the specified path, search the entire repository
    if (classNames.length === 0) {
      console.log(`No classes found in ${packagePath}. Searching the entire repository.`);
      classNames = await searchDirectory('');
    }

    if (classNames.length === 0) {
      return `No classes found in the repository. The repository might not contain any TypeScript files with class definitions.`;
    }

    let classDiagram = "```mermaid\nclassDiagram\n";
    classNames.forEach(className => {
      classDiagram += `  class ${className}\n`;
    });
    classDiagram += "```";

    return classDiagram;
  } catch (error: unknown) {
    console.error('Error generating class diagram:', error);
    return `An error occurred while generating the class diagram: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

export async function debugBotConfig(repoFullName: string): Promise<string> {
  try {
    const [owner, repo] = repoFullName.split('/');
    const { data: content } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: '.github/IBTBot.yml'
    });

    if ('content' in content && typeof content.content === 'string') {
      const configContent = Buffer.from(content.content, 'base64').toString('utf-8');
      return `IBTBot Configuration:\n\n${configContent}`;
    } else {
      return "IBTBot configuration file not found.";
    }
  } catch (error) {
    console.error('Error debugging bot config:', error);
    return "An error occurred while debugging the IBTBot configuration.";
  }
}