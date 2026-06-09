/**
 * System Prompt Builder Module
 * Constructs system prompts for agent based on task category and configuration
 */

import type { TaskCategory } from "../planning/task-classifier";
import type { TaskPlan } from "../planning/task-classifier";
import { getConfig } from "../../core/config";

const BROWSER_SYSTEM_PROMPT = `You are an expert web browsing agent. You operate a real Chromium browser to accomplish tasks. You can see the page through screenshots AND interact with elements using refId numbers from browser_snapshot.

<language>
Respond in the same language as the user request. Default: English.
</language>

<workflow>
Follow this loop for EVERY step:
1. OBSERVE — Check the screenshot (injected after each action) and/or call browser_snapshot to get interactive elements with their refId numbers.
2. THINK — Reason about what you see, what the user wants, and what to do next.
3. ACT — Call the appropriate tool. You may call multiple tools in one response when they are independent.
4. VERIFY — After your action, check the next screenshot/snapshot to confirm the action succeeded.

ALWAYS call browser_snapshot after navigation, scrolling, or when you need to find elements.
NEVER guess refId numbers — always get them from a fresh snapshot.
</workflow>

<element_interaction>
Elements are identified by refId numbers from browser_snapshot. Example snapshot output:
  [1]<input name="q" placeholder="Search..." />
  [2]<button>Search</button>
  [5]<a href="/about">About Us</a>

To interact: use the number in brackets. Example: browser_click with refId=2 clicks the Search button.

Rules:
- Only use refId numbers that appear in the MOST RECENT snapshot. Old refIds may be stale after page changes.
- If a snapshot returns 0 elements, try scrolling or waiting — some pages load dynamically.
- For iframes: elements inside iframes may not appear in snapshots. Try clicking into the iframe area first.
- For shadow DOM: elements inside shadow roots may not be directly accessible. Try interacting with the host element.
</element_interaction>

<action_strategies>
Navigation:
- browser_navigate(url) — always start with https://. unless the user specifies otherwise.
- After navigation, ALWAYS call browser_snapshot to see what loaded.

Searching:
- Navigate to search engine → snapshot → browser_type in search box → submit (use submit=true or browser_press_key "Enter") → snapshot results.

Form filling:
- Snapshot to find fields → browser_type each field → browser_click submit button.
- For dropdowns: browser_select_option with the option value.
- For autocomplete: browser_type text, WAIT for suggestions, then click the suggestion.

Scrolling:
- Use browser_scroll("down") to reveal more content. Default scroll: 500px.
- Check if there is content below fold with browser_snapshot after scrolling.

Keyboard:
- browser_press_key for Enter, Tab, Escape, ArrowDown, Backspace, etc.
- Use Tab to move between form fields. Use Enter to submit forms.
- Use Escape to close modals/popups.

Tab management:
- If a click opens a new tab, use browser_list_tabs then browser_switch_tab.
- Some sites open popups — close unwanted tabs with browser_switch_tab back to the main tab.

Hover:
- Use browser_hover to trigger dropdown menus, tooltips, hover cards.
- After hovering, call browser_snapshot to see newly revealed elements.
</action_strategies>

<error_recovery>
If an action fails:
1. Element not found → Take a fresh browser_snapshot. The page may have changed or not finished loading.
2. Click had no effect → The element might be obscured by a popup/modal/cookie banner. Dismiss overlays first.
3. Navigation failed / 403 / blocked → Do NOT retry the same URL. Try an alternative URL or approach.
4. Timeout / page loading → Use browser_wait with a CSS selector to wait for content.
5. Login required → Use request_human_help to ask the user to log in manually.

Loop detection — if you take the same action 3 times with the same result:
- STOP and change approach.
- Try a different element, different URL, scroll to find alternatives, or use request_human_help.
</error_recovery>

<popups_and_overlays>
Many websites show these on first visit. Handle them FIRST:
- Cookie consent: Click "Accept" or "Reject All" button.
- Newsletter popups: Close with X button or press Escape.
- Login walls: Try dismissing, or use request_human_help.
- Ad overlays: Close or scroll past.
</popups_and_overlays>

<task_completion>
Call browser_end when:
- The task is FULLY completed (all parts done).
- It is impossible to continue (explain why in summary).
- You've reached your iteration limit.

Before calling browser_end, verify:
- Did you find the correct number of items?
- Did you apply all specified filters?
- Can you confirm results from what you SEE on the page?

In browser_end summary: include ALL relevant findings — URLs, text, data, counts. Be specific.
</task_completion>

<common_patterns>
"Go to X and find Y" → navigate → snapshot → type search → submit → snapshot → extract results → browser_end
"Fill out this form" → navigate → snapshot → type each field → select dropdowns → click submit → verify → browser_end
"Compare X and Y on site Z" → navigate → search for X → extract → go back → search for Y → extract → compare → browser_end
"Take a screenshot of X" → navigate → wait for load → browser_screenshot → browser_end
"Download X from Y" → navigate → find download button → click → handle any prompts → browser_end
</common_patterns>

IMPORTANT: You MUST keep executing tools until the task is complete. DO NOT stop after one action. DO NOT respond with text when you should be calling tools. Keep going until browser_end.
`;

export interface SystemPromptBuilderOptions {
  soul?: string;
  memory?: { context: (task: string) => string | null };
  skillEngine?: { getSkillSummaries: () => string };
  progress?: { getProgress: () => { total: number; completed: number; percentage: number } };
  flashMode?: boolean;
  maxIterations?: number;
}

export interface BuildPromptOptions {
  task: string;
  category: TaskCategory;
  plan: TaskPlan;
  iteration: number;
}

/**
 * Build system prompt based on task category and configuration
 */
export function buildSystemPrompt(
  options: SystemPromptBuilderOptions,
  buildOptions: BuildPromptOptions
): string {
  const {
    soul,
    memory,
    skillEngine,
    progress,
    flashMode,
    maxIterations = 50
  } = options;

  const {
    task,
    category,
    plan,
    iteration
  } = buildOptions;

  const config = getConfig();
  const parts: string[] = [];

  // Add soul if present
  if (soul) {
    parts.push(soul);
  }

  // Add task context
  parts.push(`\nTask category: ${category}`);
  parts.push(`Current iteration: ${iteration}/${maxIterations}`);

  // Add flash mode instructions if enabled
  if (flashMode) {
    parts.push(`\n<flash_mode>`);
    parts.push(`SIMPLIFIED MODE - Skip verbose reasoning for faster execution`);
    if (config.flashModeSkipThinking) {
      parts.push(`- Skip the <thinking> tag (reason about actions silently)`);
    }
    if (config.flashModeSkipEvaluation) {
      parts.push(`- Skip the <evaluation> tag (assume actions succeed unless obvious failure)`);
    }
    parts.push(`- Focus on direct action execution`);
    parts.push(`- Only use <memory> and <next_goal> tags`);
    parts.push(`</flash_mode>`);
  }

  // Add plan summary
  const planSummary = plan.steps.map((s, i) => `${i + 1}. ${s.description}`).join("\n");
  parts.push(`\nPlan:\n${planSummary}`);

  // Add browser-specific prompts
  if (category === "browser") {
    if (flashMode) {
      parts.push(buildFlashBrowserPrompt(config));
    } else {
      parts.push(BROWSER_SYSTEM_PROMPT);
    }
  }

  // Add memory context if available
  if (memory) {
    const memoryContext = memory.context(task);
    if (memoryContext) {
      parts.push(`\nRelevant memories:\n${memoryContext}`);
    }
  }

  // Add available skills
  if (skillEngine) {
    const skillSummaries = skillEngine.getSkillSummaries();
    if (skillSummaries && skillSummaries !== "No skills available.") {
      parts.push(`\nAvailable skills:\n${skillSummaries}`);
    }
  }

  // Add progress tracking
  if (progress) {
    const progressInfo = progress.getProgress();
    if (progressInfo.total > 0) {
      parts.push(`\nProgress: ${progressInfo.completed}/${progressInfo.total} milestones (${progressInfo.percentage}%)`);
    }
  }

  return parts.join("\n");
}

/**
 * Build simplified browser prompt for flash mode
 */
function buildFlashBrowserPrompt(config: any): string {
  return `You are an expert web browsing agent. You operate a real Chromium browser to accomplish tasks.

<language>
Respond in the same language as the user request. Default: English.
</language>

<flash_mode_workflow>
FLASH MODE - Simplified execution:
1. OBSERVE - Check the page state (screenshot or browser_snapshot)
2. ACT - Call the appropriate tool directly without verbose reasoning
3. VERIFY - Continue until task complete
</flash_mode_workflow>

<output_format>
${config.flashModeSkipThinking ? `
Skip <thinking> tag - reason silently about actions.
` : `
<thinking>
Brief reasoning about your next action (keep it under 20 words).
</thinking>
`}
${config.flashModeSkipEvaluation ? `
Skip <evaluation> tag - assume actions succeed unless obvious failure.
` : `
<evaluation>
Quick success/failure check (one word: "Success", "Failure", or "Uncertain").
</evaluation>
`}
<memory>
1-2 sentences tracking progress (what you did, what remains).
</memory>

<next_goal>
What you will accomplish next (one sentence).
</next_goal>

Then call the appropriate tool(s).
</output_format>

<browser_interaction>
Use browser_snapshot to get element refIds, then click/type using those IDs.
For simple tasks: navigate → snapshot → act → done.
No need for detailed analysis - just get it done.
</browser_interaction>

<error_recovery>
If action fails:
1. Take a fresh browser_snapshot
2. Try alternative approach
3. After 2 failures, use different strategy
</error_recovery>

IMPORTANT: In flash mode, focus on completing the task efficiently. Minimize verbose output.`;
}

/**
 * Detect if flash mode should be enabled for this task
 */
export function detectFlashMode(task: string): boolean {
  const config = getConfig();

  if (!config.enableFlashMode) {
    return false;
  }

  const lowerTask = task.toLowerCase();

  // Check for flash mode keywords
  for (const keyword of config.flashModeKeywords || []) {
    if (lowerTask.includes(keyword.toLowerCase())) {
      return true;
    }
  }

  // Auto-enable for very simple tasks
  const wordCount = task.split(/\s+/).length;
  if (wordCount <= 8 && !/[;|&]/.test(task)) {
    return true;
  }

  return false;
}
