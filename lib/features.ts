export const PLAN_FEATURES = {
  starter: {
    max_sucursales: 1,
    max_admins: 1,
    qr_asistencia: false,
    clases: false,
    reportes_avanzados: false,
    branding_propio: false,
  },
  pro: {
    max_sucursales: 1,
    max_admins: 3,
    qr_asistencia: true,
    clases: false,
    reportes_avanzados: true,
    branding_propio: true,
  },
  multi: {
    max_sucursales: 5,
    max_admins: 10,
    qr_asistencia: true,
    clases: true,
    reportes_avanzados: true,
    branding_propio: true,
  },
} as const;

export type Plan = keyof typeof PLAN_FEATURES;
export type Feature = keyof typeof PLAN_FEATURES.multi;
