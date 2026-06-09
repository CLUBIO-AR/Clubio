// Color de acento por defecto de CLUBIO (verde de marca).
const CLUBIO_ACCENT = "#34d399";

// Marca opcional para personalizar el header de un email con la identidad de un gym
// (logo propio + color de acento). Si no se pasa, o sus campos son null/undefined,
// el email luce con la identidad de CLUBIO — así "por ahora todo lleva lo de CLUBIO"
// y queda lista la estructura para que cada gym lo personalice más adelante.
export type EmailBrand = {
  logoUrl?: string | null;
  colorAccent?: string | null;
};

// Color de acento resuelto: el del gym si lo configuró, si no el verde de CLUBIO.
// Se exporta para que otros elementos del email (botones CTA, links) usen el mismo color.
export function emailAccentColor(brand?: EmailBrand): string {
  return brand?.colorAccent || CLUBIO_ACCENT;
}

// Plantilla HTML compartida para los emails con marca — por defecto la de CLUBIO
// (leads, registro, bienvenida de owner), o la de un gym si se pasa `brand`
// (notificaciones a alumnos vía lib/notifications).
export function clubioEmailHtml(bodyHtml: string, brand?: EmailBrand): string {
  const accent = emailAccentColor(brand);
  const header = brand?.logoUrl
    ? `<img src="${brand.logoUrl}" alt="" style="max-height:32px;max-width:160px;display:block" />`
    : `<span style="font-family:monospace;font-weight:800;font-size:18px;letter-spacing:0.1em;color:${accent}">CLUBIO</span>`;

  return `
    <div style="font-family:sans-serif;max-width:520px;color:#111827">
      <div style="background:#030712;padding:20px 24px;border-radius:10px 10px 0 0;border-bottom:1px solid #1e293b">
        ${header}
      </div>
      <div style="background:#0f172a;padding:28px 24px;border-radius:0 0 10px 10px;border:1px solid #1e293b;border-top:none">
        ${bodyHtml}
        <hr style="border:none;border-top:1px solid #1e293b;margin:24px 0"/>
        <p style="color:#4b5563;font-size:12px;margin:0 0 6px">CLUBIO · Plataforma de gestión para gimnasios</p>
        <p style="color:#374151;font-size:12px;margin:0">¿Tenés dudas? Escribinos a <a href="mailto:contacto@clubio.com.ar" style="color:${accent};text-decoration:none">contacto@clubio.com.ar</a></p>
      </div>
    </div>
  `;
}

// Tabla de datos clave/valor usada en las notificaciones internas (nuevo lead, nueva solicitud, etc).
export function clubioEmailTable(rows: Array<[label: string, value: string | null | undefined]>): string {
  const cells = rows
    .filter(([, value]) => Boolean(value))
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 0;color:#9ca3af;font-size:13px;width:120px;vertical-align:top">${label}</td><td style="padding:8px 0;color:#f9fafb">${value}</td></tr>`
    )
    .join("");

  return `<table style="border-collapse:collapse;width:100%;margin:0 0 16px">${cells}</table>`;
}
