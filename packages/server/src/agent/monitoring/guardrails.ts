export interface Budget {
  maxTokens: number;
  maxIterations: number;
  maxTimeMs: number;
  usedTokens: number;
  usedIterations: number;
  usedTimeMs: number;
}

export interface RiskAssessment {
  level: "low" | "medium" | "high";
  reasons: string[];
}

export interface AuditEntry {
  timestamp: string;
  action: string;
  details: string;
  risk: RiskAssessment;
}

export class AuditLog {
  private entries: AuditEntry[] = [];

  add(action: string, details: string, risk: RiskAssessment): void {
    this.entries.push({
      timestamp: new Date().toISOString(),
      action,
      details,
      risk,
    });
  }

}

export class SharedScratchpad {
  private data: Map<string, string> = new Map();

  set(key: string, value: string): void {
    this.data.set(key, value);
  }

}

export function checkBudget(budget: Partial<Budget> & { usedIterations?: number; maxIterations?: number }): {
  exceeded: boolean;
  reason?: string;
} {
  const maxTokens = budget.maxTokens ?? Infinity;
  const maxIterations = budget.maxIterations ?? Infinity;
  const maxTimeMs = budget.maxTimeMs ?? Infinity;
  const usedTokens = budget.usedTokens ?? 0;
  const usedIterations = budget.usedIterations ?? 0;
  const usedTimeMs = budget.usedTimeMs ?? 0;

  if (usedTokens >= maxTokens) {
    return { exceeded: true, reason: "Token budget exceeded" };
  }

  if (usedIterations >= maxIterations) {
    return { exceeded: true, reason: "Iteration budget exceeded" };
  }

  if (usedTimeMs >= maxTimeMs) {
    return { exceeded: true, reason: "Time budget exceeded" };
  }

  return { exceeded: false };
}
