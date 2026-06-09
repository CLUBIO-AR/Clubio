import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireGymContext } from "@/lib/supabase/auth";

const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const MAX_SIZE_BYTES = 2 * 1024 * 1024;

// Sube el logo del gym a Storage (bucket gym-logos, RLS scoped por gym vía
// get_user_gym_id() — ver 0008_branding_emails_alumnos.sql) y actualiza gyms.logo_url.
export async function POST(request: Request) {
  const ctx = await requireGymContext().catch(() => null);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Formato inválido — usá PNG, JPG o WEBP" }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "El archivo supera los 2MB" }, { status: 400 });
  }

  const supabase = await createClient();
  const path = `${ctx.gymId}/logo.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("gym-logos")
    .upload(path, file, { contentType: file.type, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: "No pudimos subir el logo, intentá de nuevo" }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage.from("gym-logos").getPublicUrl(path);
  // Cache-buster: el path es estable (siempre logo.{ext}), así que sin esto los
  // clientes de email/navegador podrían seguir mostrando el logo anterior.
  const url = `${publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await supabase.from("gyms").update({ logo_url: url }).eq("id", ctx.gymId);
  if (updateError) {
    return NextResponse.json({ error: "Subimos el logo pero no pudimos guardarlo" }, { status: 500 });
  }

  return NextResponse.json({ url });
}
