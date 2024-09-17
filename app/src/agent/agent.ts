import { AgentExecutor, BaseMessage, HumanMessage, AIMessage } from 'langchain/agents';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { LLMChain } from 'langchain/chains';
import { PromptTemplate } from 'langchain/prompts';

// Agent roles
// (1) product manager resposible for the PRD drafting inlcuding requirement understanding, feasibility evaluation, business breakdown and readable assignment to software architect; (2) software architect receive the PRD will then draft the design document including overall architecture, core components, e.g. frontend, message queue, database etc., workflow interaction, e.g. mermaid diagram, propper open-source library & framework, e.g. redis for cache, tenacity for retry etc., and proper language to adopt e.g. react for frontend, typescript or python for backend; (3) developer receive the PRD and design document will start the coding in consideration of code quality, function flexibility and obserbility. 
const PRODUCT_MANAGER = 'product_manager';
const SOFTWARE_ARCHITECT = 'software_architect';
const DEVELOPER = 'developer';

class DevAgent {
  private model: ChatOpenAI;
  private role: string;
  private prompt: PromptTemplate;

  constructor(role: string) {
    this.model = new ChatOpenAI({ temperature: 0.7 });
    this.role = role;
    this.prompt = this.getPromptForRole(role);
  }

  private getPromptForRole(role: string): PromptTemplate {
    switch (role) {
      case PRODUCT_MANAGER:
        return new PromptTemplate({
          template: `You are a Product Manager. Draft a PRD based on the following requirement:
          
          {requirement}
          
          Include: requirement understanding, feasibility evaluation, business breakdown, and readable assignment for the software architect.`,
          inputVariables: ['requirement'],
        });
      case SOFTWARE_ARCHITECT:
        return new PromptTemplate({
          template: `You are a Software Architect. Create a design document based on the following PRD:
          
          {prd}
          
          Include: overall architecture, core components (frontend, message queue, database, etc.), workflow interaction (use mermaid diagrams), appropriate open-source libraries & frameworks, and recommended programming languages.`,
          inputVariables: ['prd'],
        });
      case DEVELOPER:
        return new PromptTemplate({
          template: `You are a Developer. Implement the code based on the following PRD and design document:
          
          PRD: {prd}
          
          Design Document: {design_doc}
          
          Consider code quality, function flexibility, and observability in your implementation.`,
          inputVariables: ['prd', 'design_doc'],
        });
      default:
        throw new Error(`Invalid role: ${role}`);
    }
  }

  async execute(input: string): Promise<string> {
    const chain = new LLMChain({ llm: this.model, prompt: this.prompt });
    const result = await chain.call({ [this.role === PRODUCT_MANAGER ? 'requirement' : 'prd']: input });
    return result.text;
  }
}

export class DevAgentGroup {
  private productManager: DevAgent;
  private softwareArchitect: DevAgent;
  private developer: DevAgent;

  constructor() {
    this.productManager = new DevAgent(PRODUCT_MANAGER);
    this.softwareArchitect = new DevAgent(SOFTWARE_ARCHITECT);
    this.developer = new DevAgent(DEVELOPER);
  }

  async processRequirement(requirement: string): Promise<string> {
    // Step 1: Product Manager creates PRD
    const prd = await this.productManager.execute(requirement);
    console.log('PRD created:', prd);

    // Step 2: Software Architect creates design document
    const designDoc = await this.softwareArchitect.execute(prd);
    console.log('Design document created:', designDoc);

    // Step 3: Developer implements the code
    const implementation = await this.developer.execute(JSON.stringify({ prd, design_doc: designDoc }));
    console.log('Implementation created:', implementation);

    return implementation;
  }
}

// Usage example
const devAgentGroup = new DevAgentGroup();
const requirement = 'Create a web application for managing todo lists with user authentication and real-time updates.';
devAgentGroup.processRequirement(requirement).then((result) => {
  console.log('Final implementation:', result);
});
