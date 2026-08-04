// Orquesta el envío de una cuota por QR in-store de Mercado Pago: crea la orden con el
// monto de la cuota, trae la imagen del QR del POS y manda el mail. Usado tanto por el
// aviso automático (worker enviar-avisos-gym) como por el reenvío manual (app/actions/cuotas.ts).
import { getMpCollectorId, createQrOrder, getPosQrImage } from "@/lib/mercadopago-qr";
import { sendCuotaQrEmail } from "@/lib/notifications/channels/email";

export type EnviarCuotaQrArgs = {
  accessToken: string;
  externalPosId: string;
  gymId: string;
  gymNombre: string;
  logoUrl?: string | null;
  colorAccento?: string | null;
  emailRemitenteNombre?: string | null;
  emailRemitenteAddress?: string | null;
  cuotaId: string;
  mes: number;
  anio: number;
  montoTotal: number;
  vencida: boolean;
  alumnoNombre: string;
  alumnoEmail: string;
};

export async function enviarCuotaQr(args: EnviarCuotaQrArgs): Promise<string> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const collectorId = await getMpCollectorId(args.accessToken);

  await createQrOrder({
    accessToken: args.accessToken,
    collectorId,
    externalPosId: args.externalPosId,
    cuotaId: args.cuotaId,
    monto: args.montoTotal,
    descripcion: `Cuota ${args.mes}/${args.anio} - ${args.alumnoNombre}`,
    notificationUrl: `${appUrl}/api/webhooks/mercadopago?gym_id=${args.gymId}`,
  });

  const qrPngBase64 = await getPosQrImage({
    accessToken: args.accessToken,
    collectorId,
    externalPosId: args.externalPosId,
  });

  return sendCuotaQrEmail({
    to: args.alumnoEmail,
    alumnoNombre: args.alumnoNombre,
    gymNombre: args.gymNombre,
    logoUrl: args.logoUrl,
    colorAccento: args.colorAccento,
    emailRemitenteNombre: args.emailRemitenteNombre,
    emailRemitenteAddress: args.emailRemitenteAddress,
    mes: args.mes,
    anio: args.anio,
    montoTotal: args.montoTotal,
    vencida: args.vencida,
    qrPngBase64,
  });
}
