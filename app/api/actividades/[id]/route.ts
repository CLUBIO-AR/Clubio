import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getApiGymId } from "@/lib/supabase/api-auth";
import { z } from "zod";

const UpdateSchema = z.object({
  nombre: z.string().min(1).max(60).optional(),
  monto_base: z.number().min(0).optional(),
  recargo_1_dias: z.number().int().min(0).nullable().optional(),
  recargo_1_porcentaje: z.number().min(0).nullable().optional(),
  recargo_2_dias: z.number().int().min(0).nullable().optional(),
  recargo_2_porcentaje: z.number().min(0).nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  activa: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gymId = await getApiGymId();
  if (!gymId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("actividades")
    .update(parsed.data)
    .eq("id", id)
    .eq("gym_id", gymId)
    .is("deleted_at", null)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gymId = await getApiGymId();
  if (!gymId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { error } = await supabase
    .from("actividades")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("gym_id", gymId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
