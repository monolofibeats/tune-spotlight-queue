import type { Layout } from 'react-grid-layout';

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  layout: Layout[];
}

export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  {
    id: 'compact',
    name: 'Compact',
    description: 'Now playing + queue — tight and efficient',
    layout: [
      { i: 'now_playing', x: 0, y: 0, w: 12, h: 9.3, minW: 6, minH: 3 },
      { i: 'search_filters', x: 0, y: 9.3, w: 12, h: 1.4, minW: 6, minH: 1 },
      { i: 'queue', x: 0, y: 10.7, w: 12, h: 20, minW: 4, minH: 6 },
    ],
  },
  {
    id: 'full',
    name: 'Full Dashboard',
    description: 'Stats + now playing + queue — everything you need',
    layout: [
      { i: 'stats', x: 0, y: 0, w: 12, h: 2, minW: 4, minH: 2 },
      { i: 'now_playing', x: 0, y: 2, w: 12, h: 9.4, minW: 6, minH: 3 },
      { i: 'search_filters', x: 0, y: 11.4, w: 12, h: 2, minW: 6, minH: 1 },
      { i: 'queue', x: 0, y: 13.4, w: 12, h: 20, minW: 4, minH: 6 },
    ],
  },
  {
    id: 'stream_focus',
    name: 'Stream Focus',
    description: 'Optimized for live streaming sessions',
    layout: [
      { i: 'now_playing', x: 0, y: 0, w: 8, h: 5, minW: 6, minH: 3 },
      { i: 'chat', x: 8, y: 0, w: 4, h: 5, minW: 3, minH: 4 },
      { i: 'search_filters', x: 0, y: 5, w: 12, h: 2, minW: 6, minH: 1 },
      { i: 'queue', x: 0, y: 7, w: 12, h: 10, minW: 4, minH: 6 },
    ],
  },
  {
    id: 'analytics',
    name: 'Analytics Heavy',
    description: 'Stats and earnings front & center',
    layout: [
      { i: 'stats', x: 0, y: 0, w: 8, h: 2, minW: 4, minH: 2 },
      { i: 'earnings', x: 8, y: 0, w: 4, h: 4, minW: 3, minH: 3 },
      { i: 'quick_settings', x: 8, y: 4, w: 4, h: 3, minW: 3, minH: 2 },
      { i: 'now_playing', x: 0, y: 2, w: 8, h: 5, minW: 6, minH: 3 },
      { i: 'search_filters', x: 0, y: 7, w: 12, h: 2, minW: 6, minH: 1 },
      { i: 'queue', x: 0, y: 9, w: 12, h: 10, minW: 4, minH: 6 },
    ],
  },
];

export function getDefaultLayout(): Layout[] {
  return DASHBOARD_TEMPLATES.find(t => t.id === 'full')!.layout;
}
