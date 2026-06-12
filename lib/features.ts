// Planes válidos: basic | multi
// Plan 'starter', 'pro' y 'plus' NO EXISTEN (plus eliminado junio 2026).
// Alumnos ILIMITADOS en todos los planes.
export const PLAN_FEATURES = {
  basic: {
    max_sucursales:     1,
    max_admins:         3,
    alumnos:            Infinity,
    cobros_automaticos: true,
    avisos_email:       true,
    pago_sin_login:     true,
    portal_alumno:      true,
    qr_asistencia:      false,   // MVP 2
    clases:             false,   // MVP 3
    reportes_avanzados: false,
    branding_propio:    true,    // branding email en todos los planes
    avisos_whatsapp:    false,
  },
  multi: {
    max_sucursales:     5,
    max_admins:         10,
    alumnos:            Infinity,
    cobros_automaticos: true,
    avisos_email:       true,
    pago_sin_login:     true,
    portal_alumno:      true,
    qr_asistencia:      true,
    clases:             true,
    reportes_avanzados: true,
    branding_propio:    true,
    avisos_whatsapp:    true,
  },
} as const;

export type Plan = keyof typeof PLAN_FEATURES;
export type Feature = keyof typeof PLAN_FEATURES.multi;
