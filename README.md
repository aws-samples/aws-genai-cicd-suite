# AWS-GenAI-CICD-Suite using AWS Bedrock

## Overview

This AWS-GenAI-CICD-Suite is a GitHub Action & GitHub App hybrid solution to perform automated code reviews, PR generation, unit test generation and issue operation etc. using AWS Bedrock API.
The default model is Claude3 Sonnet, which is suitable for general purpose with optimized cost, we also support hosting your own model in Amazon SageMaker and use the specific model id prefixed with `sagemaker.<api url>` in the action options.

## Features Overview:

### PR Content Generation:

Using AI-driven GitHub Actions, you can automatically generate content for pull requests based on the changes made in the code. This can include summaries of the changes, explanations of the impact, or even suggestions for further improvements. By automating this process, you can save time for developers and ensure that PRs are more informative and actionable.

### Code Review:

Using AI-driven GitHub Actions, you can perform automated code reviews on pull requests. The AI can analyze the code changes, identify potential issues or improvements, and provide feedback to the developers with inline comments. This can help catch bugs early, improve code quality, and ensure that best practices are followed consistently across the codebase.
The default review level is concise, but you can also choose detailed review level.

### Unit Test Generation & Pre-flight: 

Improving code quality is a critical aspect of software development. Unit tests are a fundamental tool for ensuring that code behaves as expected and that changes do not introduce regressions. However, writing unit tests can be time-consuming and error-prone, especially for complex codebases. AI-driven tools can help automate the process of generating unit tests, reducing the burden on developers and improving overall code quality. 

### Issue Operation:
Using GitHub App, you can perform issue operation by interacting inside PR comments. e.g.

- Directly reply to a review comment. Example:
```
@IBTBot generate interesting stats about this repository and render them as a table.
@IBTBot show all the console.log statements in this repository.
@IBTBot generate unit testing code for this file.
@IBTBot read src/utils.ts and generate unit testing code.
@IBTBot read the files in the src/scheduler package and generate a class diagram using mermaid and a README in the markdown format.
@IBTBot modularize this function.
```
Note: Be mindful of the bot's finite context window. It's strongly recommended to break down tasks such as reading entire modules into smaller chunks. For a focused discussion, use review comments to chat about specific files and their changes, instead of using the PR comments.

## Quick Start
### Step 1: Configuring IAM to trust GitHub
To use GitHub's OIDC provider, you must first set up federation with the provider as an IAM IdP. The GitHub OIDC provider only needs to be created once per account (i.e. multiple IAM Roles that can be assumed by the GitHub's OIDC can share a single OIDC Provider). Here is a sample CloudFormation template that will configure this trust for you.

Note that the thumbprint below has been set to all F's because the thumbprint is not used when authenticating token.actions.githubusercontent.com. This is a special case used only when GitHub's OIDC is authenticating to IAM. IAM uses its library of trusted CAs to authenticate. The value is still the API, so it must be specified.

Simplely copy the template below, it will create a role with trust relationship to GitHub OIDC provider, and add the permissions to invoke the Bedrock API.
```yaml
Parameters:
  GitHubOrg:
    Description: Name of GitHub organization/user (case sensitive)
    Type: String
  RepositoryName:
    Description: Name of GitHub repository (case sensitive)
    Type: String
  OIDCProviderArn:
    Description: Arn for the GitHub OIDC Provider.
    Default: ""
    Type: String
  OIDCAudience:
    Description: Audience supplied to configure-aws-credentials.
    Default: "sts.amazonaws.com"
    Type: String

Conditions:
  CreateOIDCProvider: !Equals 
    - !Ref OIDCProviderArn
    - ""

Resources:
  Role:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Statement:
          - Effect: Allow
            Action: sts:AssumeRoleWithWebIdentity
            Principal:
              Federated: !If 
                - CreateOIDCProvider
                - !Ref GithubOidc
                - !Ref OIDCProviderArn
            Condition:
              StringEquals:
                token.actions.githubusercontent.com:aud: !Ref OIDCAudience
              StringLike:
                token.actions.githubusercontent.com:sub: !Sub repo:${GitHubOrg}/${RepositoryName}:*
      ManagedPolicyArns:
        - !Ref BedrockPolicy

  GithubOidc:
    Type: AWS::IAM::OIDCProvider
    Condition: CreateOIDCProvider
    Properties:
      Url: https://token.actions.githubusercontent.com
      ClientIdList: 
        - sts.amazonaws.com
      ThumbprintList:
        - ffffffffffffffffffffffffffffffffffffffff

  BedrockPolicy:
    Type: AWS::IAM::ManagedPolicy
    Properties:
      PolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Action:
              - bedrock:InvokeModel
              - bedrock:ListFoundationModels
              - bedrock:GetFoundationModel
            Resource: "*"

Outputs:
  Role:
    Value: !GetAtt Role.Arn
```

You will see the role been create with trust relationship similar to the following, that string "repo:github-organization/github-repository" will limit the workflow action only been trigger by the specified respotories.

```json
{
  "Effect": "Allow",
  "Principal": {
    "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
  },
  "Action": "sts:AssumeRoleWithWebIdentity",
  "Condition": {
    "StringEquals": {
      "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
    },
    "StringLike": {
      "token.actions.githubusercontent.com:sub": "repo:github-organization/github-repository:*"
    }
  }
}
```

Then add the permissions to the role to invoke the Bedrock API, you can use the following policy as a reference.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeModel",
                "bedrock:ListFoundationModels",
                "bedrock:GetFoundationModel"
            ],
            "Resource": "*"
        }
    ]
}
```

### Step 2: AWS-GenAI-CICD-Suite GitHub Action:

Create a GitHub Actions workflow file in your repository .github/workflows directory, and add the following step to the workflow.

#### AWS-GenAI-CICD-Suite GitHub Action

**Basic Usage**

```yaml
- name: Code review using AWS Bedrock
  uses: yike5460/AWS-GenAI-CICD-Suite@stable
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    aws-region: us-east-1
```

**Advanced Usage**

```yaml
- name: Code review using AWS Bedrock
    uses: yike5460/AWS-GenAI-CICD-Suite@stable
    with:
    # Automatic Provision: The GITHUB_TOKEN is automatically created and provided by GitHub for each workflow run. You don't need to manually create or store this token as a secret.
    github-token: ${{ secrets.GITHUB_TOKEN }}
    aws-region: us-east-1
    model-id: anthropic.claude-3-sonnet-20240229-v1:0
    generate-code-review-exclude-files: '*.md,*.json'
    generate-code-review-level: 'detailed'
    generate-code-review: 'true'
    generate-pr-description: 'true'
    generate-unit-test: 'true'
    generate-unit-test-source-folder: 'src'
    output-language: 'en'
    env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Available Options**

| Option | Description | Default | Required |
| --- | --- | --- | --- |
| `github-token` | GitHub token for API access | N/A | Yes |
| `aws-region` | AWS region for Bedrock | us-east-1 | Yes |
| `model-id` | ID of the model to use for code reviews | `anthropic.claude-3-sonnet-20240229-v1:0` | Yes |
| `generate-code-review-exclude-files` | Comma-separated list of file patterns to exclude | N/A | No |
| `generate-code-review-level` | Level of detail for reviews ('detailed' or 'concise') | `'concise'` | No |
| `generate-code-review` | Whether to perform code reviews | `'false'` | No |
| `generate-pr-description` | Whether to generate PR descriptions | `'false'` | No |
| `generate-unit-test` | Whether to generate unit test suite | `'false'` | No |
| `generate-unit-test-source-folder` | The folder path where unit tests should be generated based on the source code, only applicable when generate-unit-test is true | N/A | No |
| `output-language` | Language for output | `'en'` | No |

#### Configuring AWS Credentials

To configure GitHub Actions to assume the role you just created, you will need to add a workflow file to your repository. Here is an example workflow file that will assume the role you created above and run the code review action.

```yaml
    # assume the specified IAM role and set up the AWS credentials for use in subsequent steps.
    - name: Configure AWS Credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        role-to-assume: arn:aws:iam::123456789012:role/role-name
        aws-region: us-east-1
```

#### Workflow Sample

```yaml
name: Intelligent Operations with Amazon Bedrock
# Enable manual trigger
on:
  workflow_dispatch:
  pull_request:
    types: [opened, synchronize]

    # Avoid running the same workflow on the same branch concurrently
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      # read repository contents and write pull request comments
      id-token: write
      # allow github action bot to push new content into existing pull requests
      contents: write
      # contents: read
      pull-requests: write
    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'

    - name: Install dependencies @actions/core and @actions/github
      run: |
        npm install @actions/core
        npm install @actions/github
      shell: bash

    # check if required dependencies @actions/core and @actions/github are installed
    - name: Check if required dependencies are installed
      run: |
        npm list @actions/core
        npm list @actions/github
      shell: bash

    - name: Debug GitHub Token
      run: |
        if [ -n "${{ secrets.GITHUB_TOKEN }}" ]; then
          echo "GitHub Token is set"
        else
          echo "GitHub Token is not set"
        fi

    # assume the specified IAM role and set up the AWS credentials for use in subsequent steps.
    - name: Configure AWS Credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        role-to-assume: arn:aws:iam::123456789012:role/role-name
        aws-region: us-east-1

    - name: Intelligent GitHub Actions
      uses: yike5460/AWS-GenAI-CICD-Suite@stable
      with:
        # Automatic Provision: The GITHUB_TOKEN is automatically created and provided by GitHub for each workflow run. You don't need to manually create or store this token as a secret.
        github-token: ${{ secrets.GITHUB_TOKEN }}
        aws-region: us-east-1
        model-id: anthropic.claude-3-sonnet-20240229-v1:0
        generate-code-review-exclude-files: '*.md,*.json,*.yml,*.yaml'
        generate-code-review-level: 'detailed'
        generate-code-review: 'true'
        generate-pr-description: 'true'
        generate-unit-test: 'true'
        output-language: 'en'
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

#### Using model hosted on Amazon SageMaker

Instead of using the default model with Amazon Bedrock, you can also use your own model hosted on Amazon SageMaker. Refer to the sample notebook [Here](./notebook/llama2-13b.ipynb) to host your own model on Amazon SageMaker along with API Gateway to expose the RESTful endpoint, then use the model id prefixed with `sagemaker.<api url>` in the action options.

### Step 3 (Optional): Create the GitHub App to perform issue operation
Go to app folder, run `npm run start` to start the server (make sure it have the network connection to receive GitHub events and previlege to access the Amazon Bedrock), then login to your GitHub, navigate to Settings -> Developer settings -> GitHub Apps -> New GitHub App, or click [here](https://github.com/settings/apps/new) to create a new GitHub App, fill in the required fields, and set the webhook URL to your server address http:<IP address>:3000/webhook, then click `Create GitHub App`.

## Release the action package to customize your own

```bash
# clone the repository
git clone https://github.com/yike5460/AWS-GenAI-CICD-Suite.git
cd AWS-GenAI-CICD-Suite

# build the action package
npm run package

# commit & push the changes
git add .
git commit -m "Release version $version"
git push

# release the action package
version = "stable"
git tag -a $version -m "Release version $version"
git push origin $version
gh release create $version -t "$version" -n ""

# use the action package in your workflow
- name: Code review using AWS Bedrock
  uses: your-github-username/AWS-GenAI-CICD-Suite@stable
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    aws-region: us-east-1
```

## Security Recommendations

- Use GitHub's OIDC provider to authenticate with AWS instead of long-lived credentials.
- Ensure the IAM role used has the minimum necessary permissions to invoke AWS Bedrock.
- Regularly rotate any secrets used in the workflow.
- Use the latest version of this action to benefit from security updates.

The [document](https://github.com/aws-actions/configure-aws-credentials) outlines five different methods for retrieving AWS credentials, each with its own use case. Here's a brief overview of each method:
1. GitHub's OIDC provider (Recommended):

```yaml
- name: Configure AWS Credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789100:role/my-github-actions-role
    aws-region: us-east-1
```

2. IAM User:

```yaml
- name: Configure AWS Credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: us-east-1
```

3. Assume Role using IAM User credentials:

```yaml
- name: Configure AWS Credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: us-east-1
    role-to-assume: arn:aws:iam::123456789100:role/my-github-actions-role
```

4. Assume Role using WebIdentity Token File credentials:

```yaml
- name: Configure AWS Credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789100:role/my-github-actions-role
    aws-region: us-east-1
    web-identity-token-file: /path/to/token/file
```

5. Assume Role using existing credentials:

```yaml
- name: Configure AWS Credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789100:role/my-github-actions-role
    aws-region: us-east-1
    role-chaining: true
```

**Key differences:**

1. GitHub's OIDC provider is the recommended method as it uses short-lived credentials and doesn't require storing long-term secrets.
2. IAM User method uses long-term credentials, which is less secure but simpler to set up.
3. Assuming a role with IAM User credentials adds an extra layer of security by using temporary credentials.
4. WebIdentity Token File method is useful for scenarios like Amazon EKS IRSA.
5. Using existing credentials with role chaining is helpful when you already have AWS credentials in your environment and want to assume a different role.

## License Summary
This project is licensed under Apache 2.0 License. See the LICENSE file for details.

## Roadmap planned
- Better unit test case generation with preflight execution and self-correcting, the unit tests generated by standalone LLMs still exhibit compilation/execution errors and limited coverage. Therefore, recent works have built LLM-based agents that primarily extend standalone LLMs by iteratively refining the generated unit tests towards better correctness, coverage, and fault detection capabilities.
- Support issue operation with external source e.g. search api, local file, database, etc.