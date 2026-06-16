import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const RegisterSchema = z.object({
  nombre: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones"),
  email_contacto: z.string().email(),
  password: z.string().min(8),
  nombre_admin: z.string().min(2),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = RegisterSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { nombre, slug, email_contacto, password, nombre_admin } = parsed.data;
  const supabase = createAdminClient();

  // Rate limit global: máximo 20 registros por hora. Protege contra spam de trial gyms.
  const unaHoraAtras = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await supabase
    .from("gyms")
    .select("id", { count: "exact", head: true })
    .gte("created_at", unaHoraAtras);
  if ((count ?? 0) >= 20) {
    return NextResponse.json(
      { error: "Límite de registros alcanzado. Intente nuevamente en una hora." },
      { status: 429 }
    );
  }

  // Check slug antes de crear el auth user para no gastar un createUser innecesario
  const { data: existing } = await supabase
    .from("gyms")
    .select("id")
    .eq("slug", slug)
    .is("deleted_at", null)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "Ese slug ya está en uso, elegí otro" },
      { status: 409 }
    );
  }

  // Crear usuario en Supabase Auth (no puede incluirse en la TX de DB)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email_contacto,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message ?? "Error al crear usuario" },
      { status: 500 }
    );
  }

  // Crear gym + usuario + config + licencia + sucursal en una sola TX atómica.
  // Si falla, se borra el auth user como único punto de cleanup externo.
  const { data: gymId, error: rpcError } = await supabase.rpc("crear_gym_completo", {
    p_user_id:      authData.user.id,
    p_nombre:       nombre,
    p_slug:         slug,
    p_email:        email_contacto,
    p_nombre_admin: nombre_admin,
  });

  if (rpcError || !gymId) {
    await supabase.auth.admin.deleteUser(authData.user.id);

    // La función lanza 'slug_taken' con ERRCODE unique_violation (23505)
    // ante carrera entre el check de arriba y el INSERT dentro de la TX.
    if (rpcError?.message?.includes("slug_taken") || rpcError?.code === "23505") {
      return NextResponse.json(
        { error: "Ese slug ya está en uso, elegí otro" },
        { status: 409 }
      );
    }

    console.error("[register-gym] rpc crear_gym_completo falló:", rpcError);
    return NextResponse.json(
      { error: "Error al crear el gimnasio" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, gym_id: gymId }, { status: 201 });
}
