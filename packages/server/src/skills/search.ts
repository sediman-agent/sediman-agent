import type { SkillSearchResult } from "../core/types.js";
import type { SkillEngine } from "./engine.js";

export class SkillSearchEngine {
  private engine: SkillEngine;
  private hubUrl: string;

  constructor(engine: SkillEngine, hubUrl?: string) {
    this.engine = engine;
    this.hubUrl = hubUrl ?? process.env.SEDIMAN_HUB_URL ?? "https://hub.sediman.ai";
  }

  async search(
    query: string,
    scope: "internal" | "hub" | "all" = "all",
    k = 10,
  ): Promise<SkillSearchResult[]> {
    const results: SkillSearchResult[] = [];

    if (scope === "internal" || scope === "all") {
      results.push(...(await this.searchInternal(query, k)));
    }

    if (scope === "hub" || scope === "all") {
      results.push(...(await this.searchHub(query, k)));
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, k);
  }

  private async searchInternal(
    query: string,
    k: number,
  ): Promise<SkillSearchResult[]> {
    const skills = this.engine.listSkills();
    const queryLower = query.toLowerCase();
    const queryTokens = queryLower.split(/\s+/).filter(Boolean);

    return skills
      .map((skill) => {
        const name = ((skill.name as string) ?? "").toLowerCase();
        const desc = ((skill.description as string) ?? "").toLowerCase();
        const steps = ((skill.steps as string[]) ?? []).join(" ").toLowerCase();
        const whenToUse = ((skill.when_to_use as string) ?? "").toLowerCase();
        const text = `${name} ${desc} ${steps} ${whenToUse}`;

        let score = 0;
        for (const token of queryTokens) {
          if (name === token) score += 10;
          else if (name.includes(token)) score += 5;
          if (desc.includes(token)) score += 3;
          if (steps.includes(token)) score += 1;
          if (whenToUse.includes(token)) score += 4;
        }

        const exactMatch = text.includes(queryLower);
        if (exactMatch) score += 8;

        return {
          name: skill.name as string,
          description: skill.description as string,
          score,
          category: skill.category as string | undefined,
          source: (skill.source as string) ?? "local",
        } satisfies SkillSearchResult;
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  private async searchHub(
    query: string,
    k: number,
  ): Promise<SkillSearchResult[]> {
    try {
      const url = `${this.hubUrl}/api/skills/search?q=${encodeURIComponent(query)}&limit=${k}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return [];
      const data = (await res.json()) as { skills: Array<Record<string, unknown>> };
      return (data.skills ?? []).map((s) => ({
        name: s.name as string,
        description: s.description as string,
        score: (s.score as number) ?? 1,
        category: s.category as string | undefined,
        source: "hub",
      }));
    } catch (error) {
      // Silently fail - hub may not be available
      return [];
    }
  }
}
