import { createClient } from "@supabase/supabase-js";

// One client per sport schema: the schema is fixed at construction, so each
// sport section imports its own pinned client.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { db: { schema: "mlb" } }
);

export const supabaseCfb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { db: { schema: "cfb" } }
);
