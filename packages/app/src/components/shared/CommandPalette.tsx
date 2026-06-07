import { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import {
  MessageSquare,
  FolderOpen,
  Bot,
  Server,
  Database,
  History,
  Package,
  FileText,
  Settings,
  Plus,
  Search,
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useChatStore } from '@/stores/useChatStore';

const pages = [
  { id: 'agent' as const, label: 'Chat', icon: MessageSquare },
  { id: 'projects' as const, label: 'Projects', icon: FolderOpen },
  { id: 'models' as const, label: 'Models', icon: Bot },
  { id: 'provider' as const, label: 'Provider', icon: Server },
  { id: 'memory' as const, label: 'Memory', icon: Database },
  { id: 'sessions' as const, label: 'Sessions', icon: History },
  { id: 'skills' as const, label: 'Skills', icon: Package },
  { id: 'logs' as const, label: 'Logs', icon: FileText },
  { id: 'settings' as const, label: 'Settings', icon: Settings },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const setCurrentPage = useAppStore((state) => state.setCurrentPage);
  const createConversation = useChatStore((state) => state.createConversation);
  const selectConversation = useChatStore((state) => state.selectConversation);
  const conversations = useChatStore((state) => state.conversations);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const runAction = (action: () => void) => {
    setOpen(false);
    action();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200]">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="relative mx-auto mt-[20vh] max-w-lg">
        <Command
          className="rounded-lg border border-border bg-card shadow-2xl overflow-hidden"
          label="Command palette"
        >
          <div className="flex items-center border-b border-border px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              placeholder="Type a command or search..."
              className="flex-1 h-11 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List className="max-h-72 overflow-y-auto p-1">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            <Command.Group heading="Pages" className="px-1 py-1">
              {pages.map((page) => {
                const Icon = page.icon;
                return (
                  <Command.Item
                    key={page.id}
                    value={page.label}
                    onSelect={() => runAction(() => setCurrentPage(page.id))}
                    className="flex items-center gap-3 px-3 py-2 text-sm rounded-md cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{page.label}</span>
                  </Command.Item>
                );
              })}
            </Command.Group>

            {conversations.length > 0 && (
              <Command.Group heading="Recent Conversations" className="px-1 py-1">
                {conversations.slice(0, 5).map((conv) => (
                  <Command.Item
                    key={conv.id}
                    value={conv.title}
                    onSelect={() =>
                      runAction(() => {
                        selectConversation(conv.id);
                        setCurrentPage('agent');
                      })
                    }
                    className="flex items-center gap-3 px-3 py-2 text-sm rounded-md cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{conv.title}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            <Command.Group heading="Actions" className="px-1 py-1">
              <Command.Item
                value="New Chat"
                onSelect={() =>
                  runAction(() => {
                    const conv = createConversation('New Chat');
                    selectConversation(conv.id);
                    setCurrentPage('agent');
                  })
                }
                className="flex items-center gap-3 px-3 py-2 text-sm rounded-md cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <Plus className="h-4 w-4 text-muted-foreground" />
                <span>New Chat</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
