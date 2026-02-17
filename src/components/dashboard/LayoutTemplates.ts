import type { Layout } from 'react-grid-layout';

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  layout: Layout[];
  poppedOutWidgets?: string[];
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
    description: 'Stats + now playing + queue with earnings, chat & settings popped out',
    layout: [
      { i: 'stats', x: 0, y: 0, w: 12, h: 2, minW: 4, minH: 2 },
      { i: 'now_playing', x: 0, y: 2, w: 12, h: 9.4, minW: 6, minH: 3 },
      { i: 'search_filters', x: 0, y: 11.4, w: 12, h: 2, minW: 6, minH: 1 },
      { i: 'queue', x: 0, y: 13.4, w: 12, h: 20, minW: 4, minH: 6 },
      { i: 'earnings', x: 0, y: 33.4, w: 4, h: 4, minW: 3, minH: 3 },
      { i: 'chat', x: 4, y: 33.4, w: 4, h: 6, minW: 3, minH: 4 },
      { i: 'quick_settings', x: 8, y: 33.4, w: 4, h: 3, minW: 3, minH: 2 },
    ],
    poppedOutWidgets: ['earnings', 'chat', 'quick_settings'],
  },
  {
    id: 'analytics',
    name: 'Analytics Heavy',
    description: 'Stats and earnings front & center, with chat, settings & earnings popped out',
    layout: [
      { i: 'stats', x: 0, y: 0, w: 12, h: 2, minW: 4, minH: 2 },
      { i: 'now_playing', x: 0, y: 2, w: 12, h: 17.8, minW: 6, minH: 3 },
      { i: 'search_filters', x: 0, y: 19.8, w: 12, h: 2, minW: 6, minH: 1 },
      { i: 'queue', x: 0, y: 21.8, w: 12, h: 20, minW: 4, minH: 6 },
    ],
    poppedOutWidgets: ['chat', 'quick_settings', 'earnings'],
  },
];

export function getDefaultLayout(): Layout[] {
  return DASHBOARD_TEMPLATES.find(t => t.id === 'full')!.layout;
}
