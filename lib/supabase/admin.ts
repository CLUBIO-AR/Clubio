import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Solo usar en server-side: crons, webhooks, operaciones admin.
// NUNCA exponer al cliente.
//
// Nota: SUPABASE_DB_POOLER_URL es para clientes PostgreSQL directos (Prisma, pg).
// El cliente JS de Supabase siempre usa la URL HTTPS del proyecto —
// la capa PostgREST/PgBouncer de Supabase maneja el pooling internamente.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
