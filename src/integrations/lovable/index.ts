import { createLovableAuth } from '@lovable.dev/cloud-auth-js';

export const lovable = {
  auth: createLovableAuth({
    oauthBrokerUrl: `${import.meta.env.VITE_SUPABASE_URL}/auth/v1`,
  }),
};
