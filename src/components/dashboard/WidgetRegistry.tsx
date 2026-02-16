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

export interface WidgetConfigOption {
  key: string;
  label: string;
  description?: string;
  defaultValue: boolean;
}

export interface WidgetDefinition {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  defaultSize: { w: number; h: number };
  minSize: { w: number; h: number };
  maxSize?: { w: number; h: number };
  category: 'core' | 'analytics' | 'tools';
  configOptions?: WidgetConfigOption[];
}

export type WidgetConfigs = Record<string, Record<string, boolean>>;

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  {
    id: 'queue',
    label: 'Submission Queue',
    description: 'Song list with filters, search, and bulk actions',
    icon: ListMusic,
    defaultSize: { w: 8, h: 10 },
    minSize: { w: 3, h: 4 },
    category: 'core',
    configOptions: [
      { key: 'showPosition', label: 'Position Numbers', defaultValue: true },
      { key: 'showBulkActions', label: 'Bulk Action Bar', defaultValue: true },
      { key: 'showPriorityBadge', label: 'Priority Badges', defaultValue: true },
    ],
  },
  {
    id: 'now_playing',
    label: 'Now Playing',
    description: 'Audio player, visualizer, and track details',
    icon: Play,
    defaultSize: { w: 12, h: 5 },
    minSize: { w: 3, h: 2 },
    category: 'core',
    configOptions: [
      { key: 'showActionButtons', label: 'Action Buttons (Done/Skip/Trash)', defaultValue: true },
      { key: 'showVisualizer', label: 'Audio Visualizer', defaultValue: true },
      { key: 'showLUFS', label: 'LUFS Meter', defaultValue: true },
      { key: 'showDBFS', label: 'dBFS Peak Meter', defaultValue: true },
      { key: 'showStemSeparation', label: 'Stem Separation', defaultValue: true },
      { key: 'showSubmitterInsights', label: 'Submitter Insights', defaultValue: true },
      { key: 'showSpotifyEmbed', label: 'Spotify Embed Player', defaultValue: true },
      { key: 'showSoundCloudEmbed', label: 'SoundCloud Embed', defaultValue: true },
      { key: 'showMessage', label: 'Submitter Message', defaultValue: true },
      { key: 'showDownload', label: 'Download Button', defaultValue: true },
    ],
  },
  {
    id: 'stats',
    label: 'Quick Stats',
    description: 'Total, pending, and reviewed submission counts',
    icon: BarChart3,
    defaultSize: { w: 12, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 12, h: 3 },
    category: 'analytics',
    configOptions: [
      { key: 'showTotal', label: 'Total Submissions', defaultValue: true },
      { key: 'showPending', label: 'Pending Count', defaultValue: true },
      { key: 'showReviewed', label: 'Reviewed Count', defaultValue: true },
    ],
  },
  {
    id: 'earnings',
    label: 'Earnings Overview',
    description: 'Balance, recent revenue, and payout status',
    icon: DollarSign,
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 2, h: 2 },
    category: 'analytics',
    configOptions: [
      { key: 'showBalance', label: 'Current Balance', defaultValue: true },
      { key: 'showRecentEarnings', label: 'Recent Earnings List', defaultValue: true },
      { key: 'showPayoutStatus', label: 'Payout Status', defaultValue: true },
    ],
  },
  {
    id: 'search_filters',
    label: 'Search & Filters',
    description: 'Search bar with status filter buttons',
    icon: Search,
    defaultSize: { w: 12, h: 2 },
    minSize: { w: 4, h: 1 },
    maxSize: { w: 12, h: 2 },
    category: 'tools',
    configOptions: [
      { key: 'showSearchBar', label: 'Search Bar', defaultValue: true },
      { key: 'showStatusFilters', label: 'Status Filter Buttons', defaultValue: true },
      { key: 'showTrashFilter', label: 'Trash Filter', defaultValue: true },
    ],
  },
  {
    id: 'chat',
    label: 'Support Chat',
    description: 'Private chat with platform admins',
    icon: MessageSquare,
    defaultSize: { w: 4, h: 6 },
    minSize: { w: 2, h: 3 },
    category: 'tools',
  },
  {
    id: 'quick_settings',
    label: 'Quick Settings',
    description: 'Toggle submissions open/closed, go live, etc.',
    icon: Settings,
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 2, h: 2 },
    category: 'tools',
    configOptions: [
      { key: 'showLiveToggle', label: 'Go Live Toggle', defaultValue: true },
      { key: 'showSubmissionsToggle', label: 'Submissions Open/Closed', defaultValue: true },
    ],
  },
];

export function getWidgetDef(id: string): WidgetDefinition | undefined {
  return WIDGET_REGISTRY.find(w => w.id === id);
}

export function getDefaultWidgetConfig(widgetId: string): Record<string, boolean> {
  const def = getWidgetDef(widgetId);
  if (!def?.configOptions) return {};
  const config: Record<string, boolean> = {};
  for (const opt of def.configOptions) {
    config[opt.key] = opt.defaultValue;
  }
  return config;
}
