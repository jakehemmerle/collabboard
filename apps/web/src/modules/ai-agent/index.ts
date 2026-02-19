import type { AppModule, ModuleContext } from '../../core/module-system.ts';
import type { AiAgentApi, AiAgentConfig } from './contracts.ts';

export const AI_AGENT_MODULE_ID = 'ai-agent';

let config: AiAgentConfig | null = null;

export const aiAgentModule: AppModule<AiAgentApi> = {
  id: AI_AGENT_MODULE_ID,

  async init(_ctx: ModuleContext): Promise<AiAgentApi> {
    const functionUrl = import.meta.env.VITE_AI_FUNCTION_URL ?? '';
    config = { functionUrl };

    return {
      getConfig() {
        return config!;
      },
    };
  },

  async dispose() {
    config = null;
  },
};
