import {
  Plus,
  MessageSquare,
  Edit2,
  Trash2,
  Check,
  X,
  Search,
} from 'lucide-react';
import { useState, memo, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/stores/useChatStore';
import { Button } from '@/elements/actions/Button';
import { ScrollArea } from '@/elements/data/ScrollArea';
import { Input } from '@/elements/form/Input';

interface ConversationItemProps {
  id: string;
  title: string;
  isActive: boolean;
  isEditing: boolean;
  editTitle: string;
  onSelect: (id: string) => void;
  onStartEdit: (id: string, title: string) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  onEditTitleChange: (value: string) => void;
}

const ConversationItem = memo(function ConversationItem({
  id,
  title,
  isActive,
  isEditing,
  editTitle,
  onSelect,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onEditTitleChange,
}: ConversationItemProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-3 py-1.5 text-sm',
        'transition-all duration-150',
        'border-l-2 rounded-r-md mx-1',
        isActive
          ? 'border-primary text-foreground bg-primary/5'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50'
      )}
    >
      <button
        onClick={() => onSelect(id)}
        className="flex-1 text-left flex items-center gap-2 min-w-0"
      >
        <MessageSquare className="h-3.5 w-3.5 shrink-0" />
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => onEditTitleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveEdit(id);
              if (e.key === 'Escape') onCancelEdit();
            }}
            className="flex-1 bg-background border border-border rounded px-2 py-0.5 text-xs min-w-0 focus:outline-none focus:ring-1 focus:ring-ring"
            autoFocus
            aria-label="Edit conversation title"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="truncate">{title}</span>
        )}
      </button>

      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity">
        {isEditing ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => onSaveEdit(id)}
              aria-label="Save title"
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={onCancelEdit}
              aria-label="Cancel editing"
            >
              <X className="h-3 w-3" />
            </Button>
          </>
        ) : confirmDelete ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-destructive hover:text-destructive"
              onClick={() => {
                onDelete(id);
                setConfirmDelete(false);
              }}
              aria-label="Confirm delete"
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => setConfirmDelete(false)}
              aria-label="Cancel delete"
            >
              <X className="h-3 w-3" />
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => onStartEdit(id, title)}
              aria-label={`Rename "${title}"`}
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-destructive hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
              aria-label={`Delete "${title}"`}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
});

function groupByDate(conversations: { createdAt: Date; id: string; title: string }[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const lastWeek = new Date(today.getTime() - 7 * 86400000);

  const groups: { label: string; items: typeof conversations }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Last 7 Days', items: [] },
    { label: 'Older', items: [] },
  ];

  for (const conv of conversations) {
    const d = new Date(conv.createdAt);
    if (d >= today) groups[0].items.push(conv);
    else if (d >= yesterday) groups[1].items.push(conv);
    else if (d >= lastWeek) groups[2].items.push(conv);
    else groups[3].items.push(conv);
  }

  return groups.filter((g) => g.items.length > 0);
}

export function SidebarAgent() {
  const conversations = useChatStore((state) => state.conversations);
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const selectConversation = useChatStore((state) => state.selectConversation);
  const deleteConversation = useChatStore((state) => state.deleteConversation);
  const updateConversationTitle = useChatStore((state) => state.updateConversationTitle);
  const createConversation = useChatStore((state) => state.createConversation);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showSearch && searchRef.current) {
      searchRef.current.focus();
    }
  }, [showSearch]);

  const handleStartEdit = (id: string, title: string) => {
    setEditingId(id);
    setEditTitle(title);
  };

  const handleSaveEdit = (id: string) => {
    if (editTitle.trim()) {
      updateConversationTitle(id, editTitle);
    }
    setEditingId(null);
    setEditTitle('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const handleNewChat = () => {
    const conv = createConversation('New Chat');
    selectConversation(conv.id);
  };

  const filtered = searchQuery
    ? conversations.filter((c) =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  const grouped = groupByDate(filtered);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Conversations
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setShowSearch(!showSearch)}
            aria-label="Search conversations"
          >
            <Search className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleNewChat}
            aria-label="New conversation"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {showSearch && (
        <div className="px-2 pb-1">
          <Input
            ref={searchRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="h-7 text-xs"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearchQuery('');
                setShowSearch(false);
              }
            }}
          />
        </div>
      )}

      {conversations.length === 0 ? (
        <div className="px-3 py-3 text-center">
          <p className="text-xs text-muted-foreground mb-2">No conversations yet</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewChat}
            className="h-7 text-xs w-full"
          >
            <Plus className="w-3 h-3 mr-1" />
            New Chat
          </Button>
        </div>
      ) : (
        <ScrollArea className="h-56">
          <nav className="space-y-0 py-1" aria-label="Conversations">
            {grouped.map((group) => (
              <div key={group.label}>
                <div className="px-3 pt-2 pb-1">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                    {group.label}
                  </span>
                </div>
                {group.items.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    id={conversation.id}
                    title={conversation.title}
                    isActive={activeConversationId === conversation.id}
                    isEditing={editingId === conversation.id}
                    editTitle={editTitle}
                    onSelect={selectConversation}
                    onStartEdit={handleStartEdit}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                    onDelete={deleteConversation}
                    onEditTitleChange={setEditTitle}
                  />
                ))}
              </div>
            ))}
          </nav>
        </ScrollArea>
      )}
    </div>
  );
}
