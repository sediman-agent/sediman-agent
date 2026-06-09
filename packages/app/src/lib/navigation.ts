import {
  MessageSquare,
  FolderOpen,
  Bot,
  Server,
  Database,
  History,
  Package,
  FileText,
  Clock,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export type PageId = 'agent' | 'projects' | 'models' | 'provider' | 'memory' | 'sessions' | 'skills' | 'logs' | 'schedule' | 'settings';

export interface NavItem {
  id: PageId;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { id: 'agent', label: 'Chat', icon: MessageSquare },
  { id: 'projects', label: 'Projects', icon: FolderOpen },
  { id: 'models', label: 'Models', icon: Bot },
  { id: 'provider', label: 'Provider', icon: Server },
  { id: 'memory', label: 'Memory', icon: Database },
  { id: 'sessions', label: 'Sessions', icon: History },
  { id: 'skills', label: 'Skills', icon: Package },
  { id: 'logs', label: 'Logs', icon: FileText },
  { id: 'schedule', label: 'Schedule', icon: Clock },
  { id: 'settings', label: 'Settings', icon: Settings },
];
