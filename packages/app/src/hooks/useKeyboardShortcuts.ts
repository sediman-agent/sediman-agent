import { useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { useChatStore } from '@/stores/useChatStore';

const pages = [
  'agent',
  'projects',
  'models',
  'provider',
  'memory',
  'sessions',
  'skills',
  'logs',
  'settings',
] as const;

export function useKeyboardShortcuts() {
  const setCurrentPage = useAppStore((state) => state.setCurrentPage);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const createConversation = useChatStore((state) => state.createConversation);
  const selectConversation = useChatStore((state) => state.selectConversation);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key === 'b') {
        e.preventDefault();
        setSidebarOpen(!sidebarOpen);
        return;
      }

      if (mod && e.key === 'n') {
        e.preventDefault();
        const conv = createConversation('New Chat');
        selectConversation(conv.id);
        setCurrentPage('agent');
        return;
      }

      if (mod && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const idx = parseInt(e.key) - 1;
        if (idx < pages.length) {
          setCurrentPage(pages[idx]);
        }
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [sidebarOpen, setSidebarOpen, setCurrentPage, createConversation, selectConversation]);
}
