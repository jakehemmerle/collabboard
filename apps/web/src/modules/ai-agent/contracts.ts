export interface AiAgentConfig {
  functionUrl: string;
}

export interface AiAgentApi {
  getConfig(): AiAgentConfig;
}
