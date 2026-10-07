// Normalización de teléfonos argentinos al formato que usa WhatsApp (E.164 de celular):
// 54 + 9 + código de área sin 0 + número sin 15  →  ej. "5493624865688".
//
// Acepta lo que suele cargar un gym: "362 4865688", "0362-15-4865688", "+54 362 4865688",
// "+54 9 362 15 4865688", etc. Números de otros países (no empiezan con 54 y no tienen
// largo de número nacional argentino) se devuelven solo con dígitos, sin tocar.

const LARGO_NACIONAL = 10; // código de área + número, sin 0 ni 15

// Quita el "15" de celular que va entre el código de área (2 a 4 dígitos) y el número.
function quitar15(digitos: string): string {
  if (digitos.length !== LARGO_NACIONAL + 2) return digitos;
  for (const largoArea of [2, 3, 4]) {
    if (digitos.slice(largoArea, largoArea + 2) === "15") {
      return digitos.slice(0, largoArea) + digitos.slice(largoArea + 2);
    }
  }
  return digitos;
}

/**
 * Devuelve el teléfono en formato WhatsApp para Argentina (solo dígitos, ej. "5493624865688"),
 * o null si no tiene suficientes dígitos para ser un teléfono.
 */
export function normalizarTelefonoAR(telefono?: string | null): string | null {
  if (!telefono) return null;
  let d = telefono.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2); // prefijo internacional marcado como 00
  if (d.length < LARGO_NACIONAL) return null;

  // Ya viene con código de país argentino.
  if (d.startsWith("54")) {
    let resto = d.slice(2);
    if (resto.startsWith("9")) resto = resto.slice(1);
    if (resto.startsWith("0")) resto = resto.slice(1);
    resto = quitar15(resto);
    return resto.length === LARGO_NACIONAL ? `549${resto}` : d;
  }

  // Número nacional: puede venir con 0 de larga distancia y/o con 15.
  let nacional = d.startsWith("0") ? d.slice(1) : d;
  nacional = quitar15(nacional);
  if (nacional.length === LARGO_NACIONAL) return `549${nacional}`;

  // Otro país u otro formato: dejamos los dígitos como están.
  return d;
}

/** Versión para guardar en la base: con "+" adelante (ej. "+5493624865688"). */
export function formatearTelefonoParaGuardar(telefono?: string | null): string | null {
  const n = normalizarTelefonoAR(telefono);
  return n ? `+${n}` : null;
}
