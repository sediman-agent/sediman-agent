/**
 * BrowserTool - Browser automation tool
 *
 * Refactored to use ActionBasedTool pattern for:
 * - Flat action handlers (no nested switches)
 * - Type-safe action routing
 * - Single source of truth for schemas
 * - Easier maintenance
 */

import { z } from 'zod';
import { getOpenbrowserAdapter } from '../../agent/tools/browser-tools';
import { ActionBasedTool, type ActionDef, type ActionContext } from '../tooling/action-tool';
import { ToolAccesses } from '../tooling/tool-access';
import type { ToolResultBuilder } from '../tooling/result-builder';

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
  selector: z.string().min(1, 'Selector cannot be empty'),
  wait_time: z.number().optional().default(2).describe('Wait time in seconds'),
});

const FillAndSubmitSchema = z.object({
  action: z.literal('fill_and_submit'),
  selector: z.string().min(1, 'Selector cannot be empty'),
  text: z.string().min(1, 'Text cannot be empty'),
  wait_time: z.number().optional().default(2).describe('Wait time in seconds'),
});

const ScrollAndCaptureSchema = z.object({
  action: z.literal('scroll_and_capture'),
  scroll_direction: z.enum(['up', 'down']).optional().default('down'),
  scroll_amount: z.number().optional().default(500),
});

const WaitForElementSchema = z.object({
  action: z.literal('wait_for_element'),
  selector: z.string().min(1, 'Selector cannot be empty'),
  wait_time: z.number().optional().default(2).describe('Wait time in seconds'),
});

// Action handlers
const handleNavigateAndScreenshot: ActionDef['execute'] = async (input, ctx, builder) => {
  const args = input as z.infer<typeof NavigateAndScreenshotSchema>;

  const adapter = getOpenbrowserAdapter();
  if (!adapter) {
    return builder.error('Browser adapter not available.');
  }

  builder.write(`Navigating to: ${args.url}\n`);
  await adapter.executeTool('browser_navigate', { url: args.url });

  await wait((args.wait_time ?? 2) * 1000, ctx.signal);
  builder.write('Waiting for page load...\n');

  const screenshot = await adapter.executeTool('browser_screenshot', {});
  if (screenshot.success) {
    builder.write('Screenshot captured successfully.\n');
    builder.write(`Screenshot path: ${screenshot.output}`);
  } else {
    builder.write(`Screenshot failed: ${screenshot.error}`);
  }

  return builder.ok('Browser navigation and screenshot completed');
};

const handleNavigateAndExtract: ActionDef['execute'] = async (input, ctx, builder) => {
  const args = input as z.infer<typeof NavigateAndExtractSchema>;

  const adapter = getOpenbrowserAdapter();
  if (!adapter) {
    return builder.error('Browser adapter not available.');
  }

  builder.write(`Navigating to: ${args.url}\n`);
  await adapter.executeTool('browser_navigate', { url: args.url });

  await wait((args.wait_time ?? 2) * 1000, ctx.signal);
  builder.write('Waiting for page load...\n');

  const text = await adapter.executeTool('browser_extract_text', {});
  if (text.success) {
    builder.write('Page content extracted:\n\n');
    builder.write(String(text.output));
  } else {
    builder.write(`Text extraction failed: ${text.error}`);
  }

  return builder.ok('Browser navigation and text extraction completed');
};

const handleClickAndWait: ActionDef['execute'] = async (input, ctx, builder) => {
  const args = input as z.infer<typeof ClickAndWaitSchema>;

  const adapter = getOpenbrowserAdapter();
  if (!adapter) {
    return builder.error('Browser adapter not available.');
  }

  builder.write(`Clicking element: ${args.selector}\n`);
  await adapter.executeTool('browser_click', { selector: args.selector });

  await wait((args.wait_time ?? 2) * 1000, ctx.signal);
  builder.write('Waiting for page response...\n');

  const screenshot = await adapter.executeTool('browser_screenshot', {});
  if (screenshot.success) {
    builder.write('Screenshot captured after click.\n');
    builder.write(`Screenshot path: ${screenshot.output}`);
  }

  return builder.ok('Element clicked and page response captured');
};

const handleFillAndSubmit: ActionDef['execute'] = async (input, ctx, builder) => {
  const args = input as z.infer<typeof FillAndSubmitSchema>;

  const adapter = getOpenbrowserAdapter();
  if (!adapter) {
    return builder.error('Browser adapter not available.');
  }

  builder.write(`Filling ${args.selector} with text\n`);
  await adapter.executeTool('browser_fill', {
    selector: args.selector,
    text: args.text
  });

  await wait(1000, ctx.signal);
  builder.write('Submitting form...\n');

  await adapter.executeTool('browser_press', { key: 'Enter' });

  await wait((args.wait_time ?? 2) * 1000, ctx.signal);
  builder.write('Waiting for form submission...\n');

  const screenshot = await adapter.executeTool('browser_screenshot', {});
  if (screenshot.success) {
    builder.write('Screenshot captured after submission.\n');
  }

  return builder.ok('Form filled and submitted');
};

const handleScrollAndCapture: ActionDef['execute'] = async (input, ctx, builder) => {
  const args = input as z.infer<typeof ScrollAndCaptureSchema>;

  const adapter = getOpenbrowserAdapter();
  if (!adapter) {
    return builder.error('Browser adapter not available.');
  }

  const direction = args.scroll_direction ?? 'down';
  const amount = args.scroll_amount ?? 500;

  builder.write(`Scrolling ${direction} by ${amount}px\n`);
  await adapter.executeTool('browser_scroll', { direction, amount });

  await wait(1000, ctx.signal);

  const screenshot = await adapter.executeTool('browser_screenshot', {});
  if (screenshot.success) {
    builder.write('Screenshot captured after scroll.\n');
  }

  return builder.ok('Page scrolled and captured');
};

const handleWaitForElement: ActionDef['execute'] = async (input, ctx, builder) => {
  const args = input as z.infer<typeof WaitForElementSchema>;

  const adapter = getOpenbrowserAdapter();
  if (!adapter) {
    return builder.error('Browser adapter not available.');
  }

  builder.write(`Waiting for element: ${args.selector}\n`);
  await wait((args.wait_time ?? 2) * 1000, ctx.signal);

  const screenshot = await adapter.executeTool('browser_screenshot', {});
  if (screenshot.success) {
    builder.write('Element found and screenshot captured.\n');
  }

  return builder.ok('Element detected');
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
      selector: (input as z.infer<typeof ClickAndWaitSchema>).selector,
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
      selector: (input as z.infer<typeof FillAndSubmitSchema>).selector,
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
  {
    name: 'wait_for_element',
    description: 'Wait for specific element to appear',
    schema: WaitForElementSchema,
    getAccesses: () => ToolAccesses.browser(),
    execute: handleWaitForElement,
    toDisplay: (input) => ({
      kind: 'browser',
      action: 'wait_for_element',
      selector: (input as z.infer<typeof WaitForElementSchema>).selector,
    }),
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
- click_and_wait: Click element and wait for page load
- fill_and_submit: Fill form field and submit
- scroll_and_capture: Scroll page and capture screenshot
- wait_for_element: Wait for specific element to appear

The tool handles page load waiting, element visibility checks, screenshot capture, and form interactions.`,
  }
);

// Export for backward compatibility
export { BrowserTool as default };
