import { Preference } from "mercadopago";
import { getMpClient } from "./mercadopago";

function isLocalhost(url: string) {
  return url.includes("localhost") || url.includes("127.0.0.1");
}

export async function createSuscripcionPreference(args: {
  accessToken: string;
  cobroId: string;
  gymNombre: string;
  plan: string;
  montoArs: number;
}): Promise<{ id: string; init_point: string }> {
  const client = getMpClient(args.accessToken);
  const preference = new Preference(client);

  const notificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/mp-suscripciones`;
  const local = isLocalhost(notificationUrl);

  const result = await preference.create({
    body: {
      items: [
        {
          id: args.cobroId,
          title: `Suscripción CLUBIO — Plan ${args.plan.toUpperCase()} — ${args.gymNombre}`,
          quantity: 1,
          unit_price: args.montoArs,
          currency_id: "ARS",
        },
      ],
      external_reference: `cobro-suscripcion-${args.cobroId}`,
      ...(local ? {} : { notification_url: notificationUrl }),
      statement_descriptor: "CLUBIO",
      metadata: { cobro_id: args.cobroId, gym_nombre: args.gymNombre },
    },
  });

  return { id: result.id!, init_point: result.init_point! };
}
