import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Solo usar en server-side: crons, webhooks, operaciones admin
// NUNCA exponer al cliente
export function createAdminClient() {
  // Preferir URL del connection pooler para evitar "too many connections"
  // en escenarios con múltiples workers simultáneos.
  // Configurar SUPABASE_DB_POOLER_URL en Settings > Database de Supabase.
  const supabaseUrl =
    process.env.SUPABASE_DB_POOLER_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;

  return createClient<Database>(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
