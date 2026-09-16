import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { logCron } from "@/lib/cron-logger";
import { importarAlumnosDesdeSheet } from "@/lib/import-alumnos-sheet";
import { sendAlumnosImportadosEmail } from "@/lib/notifications/channels/email";

const Schema = z.object({ gym_id: z.string().uuid() });

export async function POST(request: Request) {
  const auth = request.headers.get("Authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { gym_id } = parsed.data;
  const startTime = Date.now();
  const admin = createAdminClient();

  const { data: config } = await admin
    .from("gym_config")
    .select("google_sheet_id, google_sheet_gid")
    .eq("gym_id", gym_id)
    .single();

  if (!config?.google_sheet_id) {
    return NextResponse.json({ error: "Gym sin google_sheet_id configurado" }, { status: 400 });
  }

  const { data: gym } = await admin.from("gyms").select("nombre, email_contacto").eq("id", gym_id).single();
  if (!gym) return NextResponse.json({ error: "Gym no encontrado" }, { status: 404 });

  try {
    const { insertados, totalFilas, error } = await importarAlumnosDesdeSheet(
      admin, gym_id, config.google_sheet_id, config.google_sheet_gid
    );

    if (error) throw new Error(error);

    // Aviso a CLUBIO (ALUMNOS_IMPORT_NOTIFICACION_EMAIL) + al dueño del gym.
    const notifyTo = [process.env.ALUMNOS_IMPORT_NOTIFICACION_EMAIL, gym.email_contacto]
      .filter((email): email is string => Boolean(email));
    if (insertados.length > 0 && notifyTo.length > 0) {
      await sendAlumnosImportadosEmail({
        to: notifyTo,
        gymNombre: gym.nombre,
        alumnos: insertados,
      }).catch((err) => console.error(`[worker:importar-alumnos-sheet] email gym=${gym_id} error:`, err));
    }

    await logCron({ tipo: "importar_alumnos_sheet", gymId: gym_id, itemsCreados: insertados.length, duracionMs: Date.now() - startTime });
    return NextResponse.json({ ok: true, totalFilas, insertados: insertados.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error(`[worker:importar-alumnos-sheet] gym=${gym_id} error:`, message);
    await logCron({ tipo: "importar_alumnos_sheet", gymId: gym_id, itemsCreados: 0, duracionMs: Date.now() - startTime });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
