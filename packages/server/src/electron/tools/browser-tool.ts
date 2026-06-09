/**
 * BrowserTool - Browser automation tool
 *
 * Refactored to use BrowserController directly (Playwright-based)
 * - Flat action handlers (no nested switches)
 * - Type-safe action routing
 * - Single source of truth for schemas
 * - Easier maintenance
 */

import { z } from 'zod';
import { getBrowserController } from '../../agent/tools/browser-tools';
import { ActionBasedTool, type ActionDef, type ActionContext } from '../tooling/action-tool';
import { ToolAccesses } from '../tooling/tool-access';
import type { ToolResultBuilder } from '../tooling/result-builder';

function resolveController(ctx?: ActionContext) {
  const projectId = (ctx as any)?.projectId as string | undefined;
  return getBrowserController(projectId);
}

// Helper function for waiting
async function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => resolve(), ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timeout);
      reject(new Error('Aborted during wait'));
    });
  });
}

// Action schemas
const NavigateAndScreenshotSchema = z.object({
  action: z.literal('navigate_and_screenshot'),
  url: z.string().min(1, 'URL cannot be empty'),
  wait_time: z.number().optional().default(2).describe('Wait time in seconds'),
});

const NavigateAndExtractSchema = z.object({
  action: z.literal('navigate_and_extract'),
  url: z.string().min(1, 'URL cannot be empty'),
  wait_time: z.number().optional().default(2).describe('Wait time in seconds'),
});

const ClickAndWaitSchema = z.object({
  action: z.literal('click_and_wait'),
  refId: z.number().describe('The refId of the element to click'),
  wait_time: z.number().optional().default(2).describe('Wait time in seconds'),
});

const FillAndSubmitSchema = z.object({
  action: z.literal('fill_and_submit'),
  refId: z.number().describe('The refId of the input element'),
  text: z.string().min(1, 'Text cannot be empty'),
  wait_time: z.number().optional().default(2).describe('Wait time in seconds'),
});

const ScrollAndCaptureSchema = z.object({
  action: z.literal('scroll_and_capture'),
  scroll_direction: z.enum(['up', 'down']).optional().default('down'),
  scroll_amount: z.number().optional().default(500),
});

// Action handlers
const handleNavigateAndScreenshot: ActionDef['execute'] = async (input, ctx, builder) => {
  const args = input as z.infer<typeof NavigateAndScreenshotSchema>;

  const controller = resolveController(ctx);
  if (!controller) {
    return builder.error('Browser controller not available.');
  }

  builder.write(`Navigating to: ${args.url}\n`);
  await controller.navigate(args.url);

  await wait((args.wait_time ?? 2) * 1000, ctx.signal);
  builder.write('Waiting for page load...\n');

  const screenshot = await controller.screenshot();
  if (screenshot) {
    builder.write('Screenshot captured successfully.\n');
    builder.write(`Screenshot size: ${screenshot.length} bytes`);
  } else {
    builder.write('Screenshot failed');
  }

  return builder.ok('Browser navigation and screenshot completed');
};

const handleNavigateAndExtract: ActionDef['execute'] = async (input, ctx, builder) => {
  const args = input as z.infer<typeof NavigateAndExtractSchema>;

  const controller = resolveController(ctx);
  if (!controller) {
    return builder.error('Browser controller not available.');
  }

  builder.write(`Navigating to: ${args.url}\n`);
  await controller.navigate(args.url);

  await wait((args.wait_time ?? 2) * 1000, ctx.signal);
  builder.write('Waiting for page load...\n');

  const text = await controller.extractText();
  builder.write('Page content extracted:\n\n');
  builder.write(text.slice(0, 5000)); // Limit output
  if (text.length > 5000) {
    builder.write('...\n(content truncated)');
  }

  return builder.ok('Browser navigation and text extraction completed');
};

const handleClickAndWait: ActionDef['execute'] = async (input, ctx, builder) => {
  const args = input as z.infer<typeof ClickAndWaitSchema>;

  const controller = resolveController(ctx);
  if (!controller) {
    return builder.error('Browser controller not available.');
  }

  builder.write(`Clicking element refId: ${args.refId}\n`);
  const clickResult = await controller.click(args.refId);
  builder.write(`${clickResult}\n`);

  await wait((args.wait_time ?? 2) * 1000, ctx.signal);
  builder.write('Waiting for page response...\n');

  const screenshot = await controller.screenshot();
  if (screenshot) {
    builder.write('Screenshot captured after click.\n');
  }

  return builder.ok('Element clicked and page response captured');
};

const handleFillAndSubmit: ActionDef['execute'] = async (input, ctx, builder) => {
  const args = input as z.infer<typeof FillAndSubmitSchema>;

  const controller = resolveController(ctx);
  if (!controller) {
    return builder.error('Browser controller not available.');
  }

  builder.write(`Filling element refId ${args.refId} with text\n`);
  await controller.typeText(args.refId, args.text, true);

  await wait((args.wait_time ?? 2) * 1000, ctx.signal);
  builder.write('Waiting for form submission...\n');

  const screenshot = await controller.screenshot();
  if (screenshot) {
    builder.write('Screenshot captured after submission.\n');
  }

  return builder.ok('Form filled and submitted');
};

const handleScrollAndCapture: ActionDef['execute'] = async (input, ctx, builder) => {
  const args = input as z.infer<typeof ScrollAndCaptureSchema>;

  const controller = resolveController(ctx);
  if (!controller) {
    return builder.error('Browser controller not available.');
  }

  const direction = args.scroll_direction ?? 'down';
  const amount = args.scroll_amount ?? 500;

  builder.write(`Scrolling ${direction} by ${amount}px\n`);
  await controller.scroll(direction, amount);

  await wait(1000, ctx.signal);

  const screenshot = await controller.screenshot();
  if (screenshot) {
    builder.write('Screenshot captured after scroll.\n');
  }

  return builder.ok('Page scrolled and captured');
};

// Define all actions
const browserActions: readonly ActionDef[] = [
  {
    name: 'navigate_and_screenshot',
    description: 'Navigate to URL and capture screenshot',
    schema: NavigateAndScreenshotSchema,
    getAccesses: () => ToolAccesses.browser(),
    execute: handleNavigateAndScreenshot,
    toDisplay: (input) => ({
      kind: 'browser',
      action: 'navigate_and_screenshot',
      url: (input as z.infer<typeof NavigateAndScreenshotSchema>).url,
    }),
  },
  {
    name: 'navigate_and_extract',
    description: 'Navigate to URL and extract text content',
    schema: NavigateAndExtractSchema,
    getAccesses: () => ToolAccesses.browser(),
    execute: handleNavigateAndExtract,
    toDisplay: (input) => ({
      kind: 'browser',
      action: 'navigate_and_extract',
      url: (input as z.infer<typeof NavigateAndExtractSchema>).url,
    }),
  },
  {
    name: 'click_and_wait',
    description: 'Click element and wait for page load',
    schema: ClickAndWaitSchema,
    getAccesses: () => ToolAccesses.browser(),
    execute: handleClickAndWait,
    toDisplay: (input) => ({
      kind: 'browser',
      action: 'click_and_wait',
      refId: (input as z.infer<typeof ClickAndWaitSchema>).refId,
    }),
  },
  {
    name: 'fill_and_submit',
    description: 'Fill form field and submit',
    schema: FillAndSubmitSchema,
    getAccesses: () => ToolAccesses.browser(),
    execute: handleFillAndSubmit,
    toDisplay: (input) => ({
      kind: 'browser',
      action: 'fill_and_submit',
      refId: (input as z.infer<typeof FillAndSubmitSchema>).refId,
    }),
  },
  {
    name: 'scroll_and_capture',
    description: 'Scroll page and capture screenshot',
    schema: ScrollAndCaptureSchema,
    getAccesses: () => ToolAccesses.browser(),
    execute: handleScrollAndCapture,
    toDisplay: () => ({ kind: 'browser', action: 'scroll_and_capture' }),
  },
];

// Create the tool
export const BrowserTool = new ActionBasedTool(
  'Browser',
  browserActions,
  {
    description: `High-level browser automation for common tasks.

This tool combines multiple browser operations for convenience:
- navigate_and_screenshot: Navigate to URL and capture screenshot
- navigate_and_extract: Navigate to URL and extract text content
- click_and_wait: Click element by refId and wait for page load
- fill_and_submit: Fill form field by refId and submit
- scroll_and_capture: Scroll page and capture screenshot

The tool handles page load waiting, element visibility checks, screenshot capture, and form interactions.`,
  }
);

// Export for backward compatibility
export { BrowserTool as default };
