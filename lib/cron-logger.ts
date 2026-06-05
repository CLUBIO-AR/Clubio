import { createAdminClient } from "@/lib/supabase/admin";

interface LogCronParams {
  tipo: string;
  gymId?: string;
  esDispatcher?: boolean;
  gymsTotal?: number;
  gymsOk?: number;
  gymsError?: number;
  itemsCreados?: number;
  itemsSaltados?: number;
  itemsError?: number;
  duracionMs?: number;
  errorDetalle?: string;
}

export async function logCron(params: LogCronParams): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("cron_logs").insert({
      gym_id: params.gymId ?? null,
      tipo: params.tipo,
      es_dispatcher: params.esDispatcher ?? false,
      gyms_total: params.gymsTotal ?? null,
      gyms_ok: params.gymsOk ?? null,
      gyms_error: params.gymsError ?? null,
      items_creados: params.itemsCreados ?? null,
      items_saltados: params.itemsSaltados ?? null,
      items_error: params.itemsError ?? null,
      duracion_ms: params.duracionMs ?? null,
      error_detalle: params.errorDetalle ?? null,
    });
  } catch (err) {
    // Logging failure never blocks the cron
    console.error("[cron-logger] failed to insert log:", err);
  }
}
