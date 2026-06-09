export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
}

export interface ToolExecutor {
  (name: string, args: Record<string, unknown>): Promise<ToolResult>;
}
