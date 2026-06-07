import { apiPost, apiStream } from './apiClient';

export interface ChatStreamOptions {
  onChunk: (delta: string, phase?: string) => void;
  onProgress?: (progress: { phase: string; message: string; detail?: string }) => void;
  onDone?: (result?: any) => void;
  onError?: (error: string) => void;
}

interface RunTaskParams {
  task: string;
  model?: string;
  provider?: string;
  mode?: string;
}

class ChatService {
  async runTask(
    task: string,
    options: ChatStreamOptions,
    params?: { model?: string; provider?: string; mode?: string }
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let isDone = false;

      const requestBody: RunTaskParams = {
        task,
        mode: params?.mode || 'manager',
      };

      // Only add model and provider if they're set
      if (params?.model) requestBody.model = params.model;
      if (params?.provider) requestBody.provider = params.provider;

      apiStream(
        '/api/agent/run',
        requestBody,
        (type, data) => {
          switch (type) {
            case 'chunk':
              options.onChunk(data.delta, data.phase);
              break;
            case 'progress':
              options.onProgress?.(data);
              break;
            case 'done':
              if (!isDone) {
                isDone = true;
                options.onDone?.(data);
                resolve();
              }
              break;
            case 'error':
              if (!isDone) {
                isDone = true;
                options.onError?.(data.error || 'Unknown error');
                reject(new Error(data.error || 'Unknown error'));
              }
              break;
          }
        },
        () => {
          if (!isDone) {
            isDone = true;
            options.onDone?.();
            resolve();
          }
        },
        (err) => {
          if (!isDone) {
            isDone = true;
            options.onError?.(err.message);
            reject(err);
          }
        }
      );
    });
  }

  async stopCurrentTask(): Promise<void> {
    await apiPost('/api/agent/cancel');
  }

  async getAgentStatus(): Promise<{
    state: 'idle' | 'running' | 'error';
    currentTask?: string;
  }> {
    const status = await apiPost<any>('/api/agent/status');
    return {
      state: status.running ? 'running' : 'idle',
      currentTask: status.current_task ?? undefined,
    };
  }
}

let chatService: ChatService | null = null;

export function getChatService(): ChatService {
  if (!chatService) {
    chatService = new ChatService();
  }
  return chatService;
}

export default ChatService;
