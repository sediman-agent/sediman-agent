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

export function checkBudget(budget: Budget): {
  exceeded: boolean;
  reason?: string;
} {
  if (budget.usedTokens >= budget.maxTokens) {
    return { exceeded: true, reason: "Token budget exceeded" };
  }

  if (budget.usedIterations >= budget.maxIterations) {
    return { exceeded: true, reason: "Iteration budget exceeded" };
  }

  if (budget.usedTimeMs >= budget.maxTimeMs) {
    return { exceeded: true, reason: "Time budget exceeded" };
  }

  return { exceeded: false };
}
