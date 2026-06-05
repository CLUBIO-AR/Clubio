import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

const MESES = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export function getMpClient(accessToken: string) {
  return new MercadoPagoConfig({ accessToken });
}

export type CreatePreferenceArgs = {
  accessToken: string;
  cuotaId: string;
  gymId: string;
  alumnoNombre: string;
  mes: number;
  anio: number;
  monto: number;
  backUrls: { success: string; failure: string; pending: string };
  notificationUrl: string;
};

function isLocalhost(url: string) {
  return url.includes("localhost") || url.includes("127.0.0.1");
}

export async function createMpPreference(args: CreatePreferenceArgs) {
  const client = getMpClient(args.accessToken);
  const preference = new Preference(client);

  const concepto = `Cuota ${MESES[args.mes]} ${args.anio} - ${args.alumnoNombre}`;

  const result = await preference.create({
    body: {
      items: [
        {
          id: args.cuotaId,
          title: concepto,
          quantity: 1,
          unit_price: args.monto,
          currency_id: "ARS",
        },
      ],
      external_reference: args.cuotaId,
      // MP rechaza notification_url de localhost — solo se envía en producción
      ...(isLocalhost(args.notificationUrl) ? {} : { notification_url: args.notificationUrl }),
      back_urls: args.backUrls,
      auto_return: "approved",
      statement_descriptor: "CLUBIO",
      metadata: { gym_id: args.gymId, cuota_id: args.cuotaId },
    },
  });

  return { id: result.id!, init_point: result.init_point! };
}

export async function getMpPayment(accessToken: string, paymentId: string) {
  const client = getMpClient(accessToken);
  const payment = new Payment(client);
  return payment.get({ id: paymentId });
}
