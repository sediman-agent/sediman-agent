/**
 * Action Recorder Module
 * Handles recording browser actions
 */

import { EventEmitter } from '@/utils/EventEmitter';
import { browserService } from '../BrowserService';

export type RecordedActionType =
  | 'navigate'
  | 'click'
  | 'input'
  | 'submit'
  | 'scroll'
  | 'wait'
  | 'screenshot'
  | 'extract'
  | 'validate';

export interface RecordedAction {
  id: string;
  type: RecordedActionType;
  timestamp: number;
  description: string;
  data: Record<string, unknown>;
}

interface RecordingState {
  isRecording: boolean;
  actionCount: number;
  startTime: number | null;
  lastActionTime: number | null;
}

export class ActionRecorder extends EventEmitter {
  private state: RecordingState = {
    isRecording: false,
    actionCount: 0,
    startTime: null,
    lastActionTime: null,
  };

  private actionBuffer: RecordedAction[] = [];
  private autoCaptureEnabled = true;

  constructor() {
    super();
    this.setupBrowserListeners();
  }

  private setupBrowserListeners(): void {
    browserService.on('browser-navigate', ({ url }: { url: string }) => {
      if (this.state.isRecording && this.autoCaptureEnabled) {
        this.recordAction({
          type: 'navigate',
          data: {
            url,
            title: browserService.getState().title,
          },
        });
      }
    });

    browserService.on('browser-event', (event: unknown) => {
      if (this.state.isRecording && this.autoCaptureEnabled) {
        this.handleBrowserEvent(event);
      }
    });
  }

  private handleBrowserEvent(event: unknown): void {
    if (!(typeof event === 'object' && event)) return;

    const browserEvent = event as { type?: string; data?: { message?: string } };

    if (browserEvent.type === 'console') {
      const consoleMsg = browserEvent.data;
      if (consoleMsg?.message?.includes('skill-recording:')) {
        try {
          const actionData = JSON.parse(
            consoleMsg.message.replace('skill-recording:', '')
          );
          this.recordAction(actionData);
        } catch (e) {
          console.error('[ActionRecorder] Failed to parse action:', e);
        }
      }
    }
  }

  startRecording(): void {
    if (this.state.isRecording) {
      console.warn('[ActionRecorder] Already recording');
      return;
    }

    this.state = {
      isRecording: true,
      actionCount: 0,
      startTime: Date.now(),
      lastActionTime: null,
    };

    this.actionBuffer = [];
    this.injectRecordingScript();
    this.emit('recording-started');
  }

  stopRecording(): RecordedAction[] {
    if (!this.state.isRecording) {
      console.warn('[ActionRecorder] Not recording');
      return [];
    }

    const actions = [...this.actionBuffer];
    this.state = {
      isRecording: false,
      actionCount: 0,
      startTime: null,
      lastActionTime: null,
    };
    this.actionBuffer = [];

    this.emit('recording-stopped', actions);
    return actions;
  }

  cancelRecording(): void {
    if (!this.state.isRecording) return;

    this.state = {
      isRecording: false,
      actionCount: 0,
      startTime: null,
      lastActionTime: null,
    };
    this.actionBuffer = [];

    this.emit('recording-cancelled');
  }

  recordAction(action: Omit<RecordedAction, 'id' | 'timestamp' | 'description'>): void {
    if (!this.state.isRecording) {
      console.warn('[ActionRecorder] Not recording');
      return;
    }

    const recordedAction: RecordedAction = {
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      description: this.generateActionDescription(action),
      data: action as any,
      type: action.type as RecordedActionType,
    };

    this.actionBuffer.push(recordedAction);
    this.state.actionCount++;
    this.state.lastActionTime = Date.now();

    this.emit('action-recorded', recordedAction);
  }

  private generateActionDescription(action: Partial<RecordedAction>): string {
    const descriptions = {
      navigate: `Navigate to ${(action.data as any).url}`,
      click: `Click on ${(action.data as any).text ? `"${(action.data as any).text}"` : 'element'}`,
      input: `Enter "${(action.data as any).value}" into input field`,
      submit: 'Submit form',
      scroll: 'Scroll to position',
      wait: `Wait for ${(action.data as any).duration}ms`,
      screenshot: 'Take screenshot',
      extract: `Extract data: ${(action.data as any).name}`,
      validate: `Validate element: ${(action.data as any).condition}`,
    };

    return descriptions[action.type as RecordedActionType] || 'Unknown action';
  }

  private async injectRecordingScript(): Promise<void> {
    const script = `
      (function() {
        console.log('[ActionRecorder] Injecting capture script');

        document.addEventListener('click', function(e) {
          const selector = getSelector(e.target);
          console.log('skill-recording:', JSON.stringify({
            type: 'click',
            selector: selector,
            text: e.target.textContent?.trim().substring(0, 50),
            attributes: getElementAttributes(e.target)
          }));
        }, true);

        document.addEventListener('change', function(e) {
          if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            const selector = getSelector(e.target);
            console.log('skill-recording:', JSON.stringify({
              type: 'input',
              selector: selector,
              value: e.target.value,
              inputType: e.target.type
            }));
          }
        }, true);

        document.addEventListener('submit', function(e) {
          const selector = getSelector(e.target);
          console.log('skill-recording:', JSON.stringify({
            type: 'submit',
            selector: selector
          }));
        }, true);

        function getSelector(element) {
          if (element.id) return '#' + element.id;

          const path = [];
          let current = element;

          while (current && current !== document.body) {
            let selector = current.tagName.toLowerCase();

            if (current.id) {
              selector += '#' + current.id;
              path.unshift(selector);
              break;
            } else if (current.className) {
              selector += '.' + current.className.toString().split(' ').join('.');
            }

            let nth = 1;
            let sibling = current.previousElementSibling;
            while (sibling) {
              if (sibling.tagName === current.tagName) nth++;
              sibling = sibling.previousElementSibling;
            }

            if (nth > 1) selector += ':nth-child(' + nth + ')';
            path.unshift(selector);
            current = current.parentElement;
          }

          return path.join(' > ');
        }

        function getElementAttributes(element) {
          const attrs = {};
          for (let attr of element.attributes) {
            if (['name', 'type', 'placeholder', 'href', 'data-testid', 'aria-label'].includes(attr.name)) {
              attrs[attr.name] = attr.value;
            }
          }
          return attrs;
        }

        console.log('[ActionRecorder] Capture script loaded');
      })();
    `;

    try {
      await browserService.executeScript(script);
    } catch (error) {
      console.error('[ActionRecorder] Failed to inject script:', error);
    }
  }

  getState(): RecordingState {
    return { ...this.state };
  }

  getActions(): RecordedAction[] {
    return [...this.actionBuffer];
  }

  toggleAutoCapture(enabled: boolean): void {
    this.autoCaptureEnabled = enabled;
  }
}
