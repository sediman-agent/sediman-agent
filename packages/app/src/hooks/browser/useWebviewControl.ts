/**
 * useWebviewControl Hook
 * Exposes webview control methods globally for agent interaction
 */

import { useEffect, useCallback } from 'react';
import { WebviewController } from './types';

export function useWebviewControl(
  isOpen: boolean,
  webviewRef: React.RefObject<HTMLWebViewElement | null>,
  onNavigate: (url: string) => void
) {
  useEffect(() => {
    const webview = webviewRef.current as any;
    if (!webview) return;

    // Make webview controllable by agent via global API
    const controller: WebviewController = {
      navigate: (url: string) => {
        webview.src = url;
        onNavigate(url);
        return new Promise(resolve => {
          const handler = () => {
            webview.removeEventListener('did-finish-load', handler);
            resolve({ success: true, url });
          };
          webview.addEventListener('did-finish-load', handler, { once: true });
        });
      },
      click: async (x: number, y: number) => {
        try {
          const result = await webview.executeJavaScript(`
            (async () => {
              const element = document.elementFromPoint(${x}, ${y});
              if (element) {
                element.click();
                return { success: true, tagName: element.tagName };
              }
              return { success: false, error: 'No element at point' };
            })();
          `);
          return result;
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      type: async (selector: string, text: string) => {
        try {
          const result = await webview.executeJavaScript(`
            (async () => {
              const element = document.querySelector('${selector}');
              if (element) {
                element.focus();
                element.value = '${text}';
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
                return { success: true };
              }
              return { success: false, error: 'Element not found' };
            })();
          `);
          return result;
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      snapshot: async () => {
        try {
          const result = await webview.executeJavaScript(`
            (async () => {
              const interactive = document.querySelectorAll('button, a, input, textarea, select, [onclick], [role="button"]');
              const results = [];
              interactive.forEach((el, idx) => {
                const rect = el.getBoundingClientRect();
                results.push({
                  refId: idx,
                  tag: el.tagName.toLowerCase(),
                  type: el.type || '',
                  text: el.textContent?.slice(0, 50) || el.placeholder || '',
                  x: rect.left + rect.width / 2,
                  y: rect.top + rect.height / 2
                });
              });
              return {
                url: window.location.href,
                title: document.title,
                elements: results
              };
            })();
          `);
          return result;
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      evaluate: async (script: string) => {
        try {
          const result = await webview.executeJavaScript(script);
          return { success: true, result };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      getURL: () => webview.src,
      reload: () => webview.reload(),
      goBack: () => webview.goBack(),
      goForward: () => webview.goForward()
    };

    (window as any).webviewController = controller;

    const handleBrowserCommand = (event: any) => {
      const { action, params } = event.detail;
      if (action === 'navigate' && params?.url) {
        controller.navigate(params.url);
      }
    };

    window.addEventListener('browser-command', handleBrowserCommand);

    return () => {
      delete (window as any).webviewController;
      window.removeEventListener('browser-command', handleBrowserCommand);
    };
  }, [isOpen, webviewRef, onNavigate]);
}
