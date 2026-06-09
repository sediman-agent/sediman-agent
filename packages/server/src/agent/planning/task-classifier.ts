/**
 * Task Classification Module
 * Classifies incoming tasks into categories for optimized processing
 */

export type TaskCategory = "simple" | "complex" | "browser" | "research" | "creative";
export type TaskPlan = { steps: Array<{ description: string; strategy: string }> };

export interface TaskClassifierOptions {
  mode?: string;
}

/**
 * Classify task into category based on content and mode
 */
export function classifyTask(task: string, options: TaskClassifierOptions = {}): TaskCategory {
  const { mode } = options;

  if (mode) {
    const modeMap: Record<string, TaskCategory> = {
      browser: "browser",
      research: "research",
      creative: "creative",
      simple: "simple",
      complex: "complex",
    };
    const mapped = modeMap[mode];
    if (mapped) return mapped;
  }

  const lower = task.toLowerCase();

  // Enhanced browser keyword detection
  const browserKeywords = [
    "browse", "navigate", "click", "open website", "open page",
    "web page", "screenshot", "scroll", "visit", "go to", "search",
    "google", "find", "type", "input"
  ];
  const researchKeywords = [
    "research", "find information", "compare", "analyze",
    "gather data", "summarize"
  ];
  const creativeKeywords = [
    "write", "create", "compose", "design", "draft", "generate content"
  ];

  // Check for browser/search tasks first (more specific)
  if (browserKeywords.some((k) => lower.includes(k))) return "browser";
  if (researchKeywords.some((k) => lower.includes(k))) return "research";
  if (creativeKeywords.some((k) => lower.includes(k))) return "creative";
  if (isSimple(task)) return "simple";
  return "complex";
}

/**
 * Check if task is simple (short, no complex operations)
 */
export function isSimple(task: string): boolean {
  const wordCount = task.split(/\s+/).length;
  return wordCount <= 15 && !/[;|&]/.test(task);
}

/**
 * Create execution plan based on task category
 */
export function createPlan(task: string, category: TaskCategory): TaskPlan {
  const lower = task.toLowerCase();

  // For browser/search tasks, create specific steps
  if (category === "browser" || lower.includes("search") || lower.includes("visit")) {
    // Extract search query if present
    const searchMatch = task.match(/(?:search|find|google|for)?\s*["']?([^"'\n]+)["']?\s*(?:on|at|in|via)?\s*(?:google|search)?/i);
    const searchQuery = searchMatch ? searchMatch[1] : "the target";

    return {
      steps: [
        { description: `Navigate to website`, strategy: "direct" },
        { description: `Take snapshot to find interactive elements`, strategy: "direct" },
        { description: `Type "${searchQuery}" in search box and submit`, strategy: "direct" },
        { description: `Take screenshot of results`, strategy: "direct" },
        { description: `Report findings`, strategy: "direct" },
      ],
    };
  }

  const stepsByCategory: Record<TaskCategory, Array<{ description: string; strategy: string }>> = {
    simple: [{ description: "Execute task directly", strategy: "direct" }],
    complex: [
      { description: "Analyze task requirements", strategy: "direct" },
      { description: "Execute subtasks", strategy: "direct" },
      { description: "Verify and synthesize results", strategy: "direct" },
    ],
    browser: [
      { description: "Navigate to target URL", strategy: "direct" },
      { description: "Take snapshot to find interactive elements", strategy: "direct" },
      { description: "Interact with elements (click, type, scroll)", strategy: "direct" },
      { description: "Verify results and extract information", strategy: "direct" },
      { description: "Call browser_end with summary", strategy: "direct" },
    ],
    research: [
      { description: "Search for information", strategy: "direct" },
      { description: "Analyze findings", strategy: "direct" },
      { description: "Compile results", strategy: "direct" },
    ],
    creative: [
      { description: "Understand requirements", strategy: "direct" },
      { description: "Generate content", strategy: "direct" },
      { description: "Review and refine", strategy: "direct" },
    ],
  };

  return { steps: stepsByCategory[category] ?? stepsByCategory.simple };
}
