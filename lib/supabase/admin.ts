import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

/**
 * Supabase admin client — uses the service_role key.
 * Bypasses Row-Level Security. NEVER expose to the browser.
 * Only use in:
 *   - PayPal webhook handlers (granting credits after payment)
 *   - Server-side credit deduction (atomic transactions)
 *   - Trusted admin operations
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
