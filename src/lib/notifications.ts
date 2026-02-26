import { supabase } from '@/integrations/supabase/client';

type NotificationType =
  | 'team_invitation'
  | 'payout_requested'
  | 'payout_approved'
  | 'payout_rejected'
  | 'session_started'
  | 'session_ended'
  | 'profile_change'
  | 'support_reply';

interface NotificationPayload {
  type: NotificationType;
  [key: string]: unknown;
}

/**
 * Fire-and-forget notification. Errors are logged but never thrown,
 * so callers can use `await sendNotification(...)` without wrapping in try/catch.
 */
export async function sendNotification(payload: NotificationPayload): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-notification', {
      body: payload,
    });
    if (error) {
      console.warn('[sendNotification] edge function error:', error);
    }
  } catch (e) {
    console.warn('[sendNotification] failed:', e);
  }
}
