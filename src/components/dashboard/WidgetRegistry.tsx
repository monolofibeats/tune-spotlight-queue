import {
  BarChart3,
  ListMusic,
  Play,
  Search,
  DollarSign,
  Settings,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';

export interface WidgetDefinition {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  defaultSize: { w: number; h: number };
  minSize: { w: number; h: number };
  maxSize?: { w: number; h: number };
  category: 'core' | 'analytics' | 'tools';
}

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  {
    id: 'queue',
    label: 'Submission Queue',
    description: 'Song list with filters, search, and bulk actions',
    icon: ListMusic,
    defaultSize: { w: 8, h: 10 },
    minSize: { w: 4, h: 6 },
    category: 'core',
  },
  {
    id: 'now_playing',
    label: 'Now Playing',
    description: 'Audio player, visualizer, and track details',
    icon: Play,
    defaultSize: { w: 12, h: 5 },
    minSize: { w: 6, h: 3 },
    category: 'core',
  },
  {
    id: 'stats',
    label: 'Quick Stats',
    description: 'Total, pending, and reviewed submission counts',
    icon: BarChart3,
    defaultSize: { w: 12, h: 2 },
    minSize: { w: 4, h: 2 },
    maxSize: { w: 12, h: 3 },
    category: 'analytics',
  },
  {
    id: 'earnings',
    label: 'Earnings Overview',
    description: 'Balance, recent revenue, and payout status',
    icon: DollarSign,
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    category: 'analytics',
  },
  {
    id: 'search_filters',
    label: 'Search & Filters',
    description: 'Search bar with status filter buttons',
    icon: Search,
    defaultSize: { w: 12, h: 2 },
    minSize: { w: 6, h: 1 },
    maxSize: { w: 12, h: 2 },
    category: 'tools',
  },
  {
    id: 'chat',
    label: 'Support Chat',
    description: 'Private chat with platform admins',
    icon: MessageSquare,
    defaultSize: { w: 4, h: 6 },
    minSize: { w: 3, h: 4 },
    category: 'tools',
  },
  {
    id: 'quick_settings',
    label: 'Quick Settings',
    description: 'Toggle submissions open/closed, go live, etc.',
    icon: Settings,
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    category: 'tools',
  },
];

export function getWidgetDef(id: string): WidgetDefinition | undefined {
  return WIDGET_REGISTRY.find(w => w.id === id);
}
