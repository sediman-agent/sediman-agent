/**
 * Skill Exporter Module
 * Converts recorded skills to different formats
 */

import { RecordedSkill } from './SkillManager';

export interface ExportOptions {
  format: 'playwright' | 'puppeteer' | 'javascript' | 'json';
  includeComments?: boolean;
  indent?: number;
}

export class SkillExporter {
  /**
   * Convert skill to executable code
   */
  static toExecutable(skill: RecordedSkill, options: ExportOptions = { format: 'javascript' }): string {
    switch (options.format) {
      case 'playwright':
        return this.toPlaywright(skill, options.includeComments);
      case 'puppeteer':
        return this.toPuppeteer(skill, options.includeComments);
      case 'javascript':
        return this.toJavaScript(skill, options.includeComments);
      case 'json':
        return JSON.stringify(skill, null, options.indent || 2);
      default:
        return this.toJavaScript(skill, options.includeComments);
    }
  }

  /**
   * Convert to Playwright format
   */
  private static toPlaywright(skill: RecordedSkill, includeComments = true): string {
    const actions = skill.actions.map(action => {
      const comment = includeComments ? `// ${action.description}\n    ` : '';
      switch (action.type) {
        case 'navigate':
          return `${comment}await page.goto('${action.data.url}');`;
        case 'click':
          return `${comment}await page.click('${action.data.selector}');`;
        case 'input':
          return `${comment}await page.fill('${action.data.selector}', '${action.data.value}');`;
        case 'submit':
          return `${comment}await page.click('${action.data.selector}');`;
        case 'wait':
          return `${comment}await page.waitForTimeout(${action.data.duration});`;
        case 'screenshot':
          return `${comment}await page.screenshot({ path: '${action.data.name || 'screenshot'}.png' });`;
        case 'extract':
          return `${comment}const ${action.data.name} = await page.textContent('${action.data.selector}');`;
        case 'validate':
          return `${comment}await expect(page.locator('${action.data.selector}')).${action.data.condition}();`;
        default:
          return `${comment}// Unknown action: ${action.type}`;
      }
    });

    return `
// Skill: ${skill.name}
// Description: ${skill.description}
// Category: ${skill.category}
// Actions: ${skill.actions.length}

import { test, expect } from '@playwright/test';

test('${skill.name}', async ({ page }) => {
${actions.map(a => '    ' + a).join('\n')}
});
    `.trim();
  }

  /**
   * Convert to Puppeteer format
   */
  private static toPuppeteer(skill: RecordedSkill, includeComments = true): string {
    const actions = skill.actions.map(action => {
      const comment = includeComments ? `// ${action.description}\n    ` : '';
      switch (action.type) {
        case 'navigate':
          return `${comment}await page.goto('${action.data.url}');`;
        case 'click':
          return `${comment}await page.click('${action.data.selector}');`;
        case 'input':
          return `${comment}await page.type('${action.data.selector}', '${action.data.value}');`;
        case 'submit':
          return `${comment}await page.click('${action.data.selector}');`;
        case 'wait':
          return `${comment}await page.waitForTimeout(${action.data.duration});`;
        case 'screenshot':
          return `${comment}await page.screenshot({ path: '${action.data.name || 'screenshot'}.png' });`;
        case 'extract':
          return `${comment}const ${action.data.name} = await page.$eval('${action.data.selector}', el => el.textContent);`;
        case 'validate':
          return `${comment}const element = await page.$('${action.data.selector}');`;
        default:
          return `${comment}// Unknown action: ${action.type}`;
      }
    });

    return `
// Skill: ${skill.name}
// Description: ${skill.description}
// Category: ${skill.category}
// Actions: ${skill.actions.length}

const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  try {
${actions.map(a => '    ' + a).join('\n')}
    console.log('Skill "${skill.name}" completed successfully');
  } catch (error) {
    console.error('Skill "${skill.name}" failed:', error);
  } finally {
    await browser.close();
  }
})();
    `.trim();
  }

  /**
   * Convert to plain JavaScript format
   */
  private static toJavaScript(skill: RecordedSkill, includeComments = true): string {
    const actions = skill.actions.map(action => {
      const comment = includeComments ? `// ${action.description}\n    ` : '';
      switch (action.type) {
        case 'navigate':
          return `${comment}window.location.href = '${action.data.url}';`;
        case 'click':
          return `${comment}document.querySelector('${action.data.selector}').click();`;
        case 'input':
          return `${comment}document.querySelector('${action.data.selector}').value = '${action.data.value}';`;
        case 'submit':
          return `${comment}document.querySelector('${action.data.selector}').submit();`;
        case 'wait':
          return `${comment}await new Promise(resolve => setTimeout(resolve, ${action.data.duration}));`;
        case 'screenshot':
          return `${comment}// Screenshot: ${action.data.name || 'screenshot'}`;
        case 'extract':
          return `${comment}const ${action.data.name} = document.querySelector('${action.data.selector}').textContent;`;
        case 'validate':
          return `${comment}const exists = !!document.querySelector('${action.data.selector}');`;
        default:
          return `${comment}// Unknown action: ${action.type}`;
      }
    });

    return `
// Skill: ${skill.name}
// Description: ${skill.description}
// Category: ${skill.category}
// Actions: ${skill.actions.length}

async function executeSkill() {
  try {
${actions.map(a => '    ' + a).join('\n')}
    console.log('Skill "${skill.name}" completed successfully');
    return { success: true };
  } catch (error) {
    console.error('Skill "${skill.name}" failed:', error);
    return { success: false, error };
  }
}

// Execute if running directly
if (typeof window !== 'undefined') {
  executeSkill();
}

module.exports = { executeSkill };
    `.trim();
  }

  /**
   * Export skill summary
   */
  static toSummary(skill: RecordedSkill): string {
    const actionSummary = skill.actions.reduce((acc, action) => {
      acc[action.type] = (acc[action.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return `
Skill: ${skill.name}
Description: ${skill.description}
Category: ${skill.category}
Created: ${new Date(skill.createdAt).toLocaleString()}
Updated: ${new Date(skill.updatedAt).toLocaleString()}
Author: ${skill.author}
Version: ${skill.version}
Tags: ${skill.tags.join(', ')}

Actions (${skill.actions.length}):
${Object.entries(actionSummary).map(([type, count]) => `  - ${type}: ${count}`).join('\n')}
    `.trim();
  }
}
