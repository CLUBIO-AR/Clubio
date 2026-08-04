// QR in-store de Mercado Pago (Orders API / QR seller) — comisión menor que Checkout Pro.
// El SDK oficial "mercadopago" (v3) no cubre esta API, así que se llama por fetch directo.
// El QR es estático por POS: no se genera una imagen nueva por cobro, se le asigna el
// monto a la orden abierta de esa caja y el socio escanea siempre el mismo QR.

const MP_API = "https://api.mercadopago.com";

export async function getMpCollectorId(accessToken: string): Promise<string> {
  const res = await fetch(`${MP_API}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`MP users/me error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return String(data.id);
}

export type CreateQrOrderArgs = {
  accessToken: string;
  collectorId: string;
  externalPosId: string;
  cuotaId: string;
  monto: number;
  descripcion: string;
  notificationUrl: string;
};

export async function createQrOrder(args: CreateQrOrderArgs): Promise<void> {
  const url = `${MP_API}/instore/orders/qr/seller/collectors/${args.collectorId}/pos/${args.externalPosId}/orders`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      external_reference: args.cuotaId,
      title: args.descripcion,
      description: args.descripcion,
      notification_url: args.notificationUrl,
      total_amount: args.monto,
      items: [
        {
          sku_number: args.cuotaId,
          category: "services",
          title: args.descripcion,
          description: args.descripcion,
          unit_price: args.monto,
          quantity: 1,
          unit_measure: "unit",
          total_amount: args.monto,
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`MP crear orden QR error: ${res.status} ${await res.text()}`);
}

export type GetPosQrImageArgs = {
  accessToken: string;
  collectorId: string;
  externalPosId: string;
};

// Devuelve la imagen PNG del QR estático del POS en base64, lista para adjuntar al mail.
export async function getPosQrImage(args: GetPosQrImageArgs): Promise<string> {
  const res = await fetch(`${MP_API}/pos/${args.externalPosId}?user_id=${args.collectorId}`, {
    headers: { Authorization: `Bearer ${args.accessToken}` },
  });
  if (!res.ok) throw new Error(`MP consultar POS error: ${res.status} ${await res.text()}`);
  const pos = await res.json();

  const qrImageUrl: string | undefined = pos.qr?.image;
  if (!qrImageUrl) throw new Error("El POS no tiene imagen de QR disponible");

  const imgRes = await fetch(qrImageUrl);
  if (!imgRes.ok) throw new Error(`Error descargando imagen QR: ${imgRes.status}`);
  const buffer = Buffer.from(await imgRes.arrayBuffer());
  return buffer.toString("base64");
}
