// Tipos base para Supabase — reemplazar con los generados por:
// npx supabase gen types typescript --project-id <id> > types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      gyms: {
        Row: {
          id: string;
          nombre: string;
          slug: string;
          email_contacto: string;
          telefono: string | null;
          direccion: string | null;
          logo_url: string | null;
          activo: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          nombre: string;
          slug: string;
          email_contacto: string;
          telefono?: string | null;
          direccion?: string | null;
          logo_url?: string | null;
          activo?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          nombre?: string;
          slug?: string;
          email_contacto?: string;
          telefono?: string | null;
          direccion?: string | null;
          logo_url?: string | null;
          activo?: boolean;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      licencias: {
        Row: {
          id: string;
          gym_id: string;
          plan: "basic" | "plus" | "multi";
          fecha_inicio: string;
          fecha_vencimiento: string;
          activa: boolean;
          max_sucursales: number;
          feature_qr: boolean;
          feature_clases: boolean;
          feature_reportes: boolean;
          feature_branding: boolean;
          feature_whatsapp: boolean;
          feature_cobros: boolean;
          feature_avisos: boolean;
          max_admins: number;
          precio_pagado: number | null;
          moneda: string;
          es_trial: boolean;
          trial_hasta: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          plan?: "basic" | "plus" | "multi";
          fecha_inicio: string;
          fecha_vencimiento: string;
          activa?: boolean;
          max_sucursales?: number;
          feature_qr?: boolean;
          feature_clases?: boolean;
          feature_reportes?: boolean;
          feature_branding?: boolean;
          feature_whatsapp?: boolean;
          feature_cobros?: boolean;
          feature_avisos?: boolean;
          max_admins?: number;
          precio_pagado?: number | null;
          moneda?: string;
          es_trial?: boolean;
          trial_hasta?: string | null;
        };
        Update: {
          plan?: "basic" | "plus" | "multi";
          fecha_inicio?: string;
          fecha_vencimiento?: string;
          activa?: boolean;
          max_sucursales?: number;
          feature_qr?: boolean;
          feature_clases?: boolean;
          feature_reportes?: boolean;
          feature_branding?: boolean;
          feature_whatsapp?: boolean;
          feature_cobros?: boolean;
          feature_avisos?: boolean;
          max_admins?: number;
          precio_pagado?: number | null;
          moneda?: string;
          es_trial?: boolean;
          trial_hasta?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "licencias_gym_id_fkey";
            columns: ["gym_id"];
            isOneToOne: false;
            referencedRelation: "gyms";
            referencedColumns: ["id"];
          }
        ];
      };
      sucursales: {
        Row: {
          id: string;
          gym_id: string;
          nombre: string;
          direccion: string | null;
          telefono: string | null;
          activa: boolean;
          es_principal: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          gym_id: string;
          nombre: string;
          direccion?: string | null;
          telefono?: string | null;
          activa?: boolean;
          es_principal?: boolean;
        };
        Update: {
          nombre?: string;
          direccion?: string | null;
          telefono?: string | null;
          activa?: boolean;
          es_principal?: boolean;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sucursales_gym_id_fkey";
            columns: ["gym_id"];
            isOneToOne: false;
            referencedRelation: "gyms";
            referencedColumns: ["id"];
          }
        ];
      };
      sucursal_config: {
        Row: {
          id: string;
          sucursal_id: string;
          gym_id: string;
          monto_base_defecto: number | null;
          dia_vencimiento_mensual: number | null;
          dias_gracia: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sucursal_id: string;
          gym_id: string;
          monto_base_defecto?: number | null;
          dia_vencimiento_mensual?: number | null;
          dias_gracia?: number | null;
        };
        Update: {
          monto_base_defecto?: number | null;
          dia_vencimiento_mensual?: number | null;
          dias_gracia?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sucursal_config_sucursal_id_fkey";
            columns: ["sucursal_id"];
            isOneToOne: true;
            referencedRelation: "sucursales";
            referencedColumns: ["id"];
          }
        ];
      };
      gym_config: {
        Row: {
          id: string;
          gym_id: string;
          mp_access_token: string | null;
          mp_public_key: string | null;
          mp_webhook_secret: string | null;
          monto_base_defecto: number | null;
          dia_vencimiento_mensual: number;
          dias_gracia: number;
          recargo_1_dias: number;
          recargo_1_porcentaje: number;
          recargo_2_dias: number | null;
          recargo_2_porcentaje: number | null;
          dias_aviso_antes: number[];
          aviso_post_vencimiento_dias: number;
          max_avisos_post: number;
          email_activo: boolean;
          email_remitente_nombre: string | null;
          email_remitente_address: string | null;
          email_color_acento: string | null;
          email_templates: Json | null;
          whatsapp_activo: boolean;
          whatsapp_phone_number_id: string | null;
          whatsapp_access_token: string | null;
          generar_cuota_al_alta: boolean;
          cuota_alta_proporcional: boolean;
          dias_minimos_para_cuota_alta: number;
          color_primario: string;
          color_secundario: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          mp_access_token?: string | null;
          mp_public_key?: string | null;
          mp_webhook_secret?: string | null;
          monto_base_defecto?: number | null;
          dia_vencimiento_mensual?: number;
          dias_gracia?: number;
          recargo_1_dias?: number;
          recargo_1_porcentaje?: number;
          recargo_2_dias?: number | null;
          recargo_2_porcentaje?: number | null;
          dias_aviso_antes?: number[];
          aviso_post_vencimiento_dias?: number;
          max_avisos_post?: number;
          email_activo?: boolean;
          email_remitente_nombre?: string | null;
          email_remitente_address?: string | null;
          email_color_acento?: string | null;
          email_templates?: Json | null;
          whatsapp_activo?: boolean;
          whatsapp_phone_number_id?: string | null;
          whatsapp_access_token?: string | null;
          generar_cuota_al_alta?: boolean;
          cuota_alta_proporcional?: boolean;
          dias_minimos_para_cuota_alta?: number;
          color_primario?: string;
          color_secundario?: string;
        };
        Update: {
          mp_access_token?: string | null;
          mp_public_key?: string | null;
          mp_webhook_secret?: string | null;
          monto_base_defecto?: number | null;
          dia_vencimiento_mensual?: number;
          dias_gracia?: number;
          recargo_1_dias?: number;
          recargo_1_porcentaje?: number;
          recargo_2_dias?: number | null;
          recargo_2_porcentaje?: number | null;
          dias_aviso_antes?: number[];
          aviso_post_vencimiento_dias?: number;
          max_avisos_post?: number;
          email_activo?: boolean;
          email_remitente_nombre?: string | null;
          email_remitente_address?: string | null;
          email_color_acento?: string | null;
          email_templates?: Json | null;
          whatsapp_activo?: boolean;
          whatsapp_phone_number_id?: string | null;
          whatsapp_access_token?: string | null;
          generar_cuota_al_alta?: boolean;
          cuota_alta_proporcional?: boolean;
          dias_minimos_para_cuota_alta?: number;
          color_primario?: string;
          color_secundario?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gym_config_gym_id_fkey";
            columns: ["gym_id"];
            isOneToOne: true;
            referencedRelation: "gyms";
            referencedColumns: ["id"];
          }
        ];
      };
      gym_usuarios: {
        Row: {
          id: string;
          gym_id: string;
          nombre: string;
          email: string | null;
          rol: "owner" | "admin" | "recepcion";
          activo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          gym_id: string;
          nombre: string;
          email?: string | null;
          rol?: "owner" | "admin" | "recepcion";
          activo?: boolean;
        };
        Update: {
          nombre?: string;
          email?: string | null;
          rol?: "owner" | "admin" | "recepcion";
          activo?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gym_usuarios_gym_id_fkey";
            columns: ["gym_id"];
            isOneToOne: false;
            referencedRelation: "gyms";
            referencedColumns: ["id"];
          }
        ];
      };
      alumnos: {
        Row: {
          id: string;
          gym_id: string;
          sucursal_id: string | null;
          nombre: string;
          apellido: string;
          dni: string;
          email: string | null;
          telefono: string | null;
          fecha_nacimiento: string | null;
          fecha_alta: string;
          fecha_baja: string | null;
          activo: boolean;
          auth_user_id: string | null;
          monto_cuota_personalizado: number | null;
          notas: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          gym_id: string;
          sucursal_id?: string | null;
          nombre: string;
          apellido: string;
          dni: string;
          email?: string | null;
          telefono?: string | null;
          fecha_nacimiento?: string | null;
          fecha_alta?: string;
          fecha_baja?: string | null;
          activo?: boolean;
          auth_user_id?: string | null;
          monto_cuota_personalizado?: number | null;
          notas?: string | null;
        };
        Update: {
          sucursal_id?: string | null;
          nombre?: string;
          apellido?: string;
          dni?: string;
          email?: string | null;
          telefono?: string | null;
          fecha_nacimiento?: string | null;
          fecha_alta?: string;
          fecha_baja?: string | null;
          activo?: boolean;
          auth_user_id?: string | null;
          monto_cuota_personalizado?: number | null;
          notas?: string | null;
          deleted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alumnos_gym_id_fkey";
            columns: ["gym_id"];
            isOneToOne: false;
            referencedRelation: "gyms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alumnos_sucursal_id_fkey";
            columns: ["sucursal_id"];
            isOneToOne: false;
            referencedRelation: "sucursales";
            referencedColumns: ["id"];
          }
        ];
      };
      actividades: {
        Row: {
          id: string;
          gym_id: string;
          nombre: string;
          monto_base: number;
          recargo_1_dias: number | null;
          recargo_1_porcentaje: number | null;
          recargo_2_dias: number | null;
          recargo_2_porcentaje: number | null;
          color: string;
          activa: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          gym_id: string;
          nombre: string;
          monto_base: number;
          recargo_1_dias?: number | null;
          recargo_1_porcentaje?: number | null;
          recargo_2_dias?: number | null;
          recargo_2_porcentaje?: number | null;
          color?: string;
          activa?: boolean;
        };
        Update: {
          nombre?: string;
          monto_base?: number;
          recargo_1_dias?: number | null;
          recargo_1_porcentaje?: number | null;
          recargo_2_dias?: number | null;
          recargo_2_porcentaje?: number | null;
          color?: string;
          activa?: boolean;
          deleted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "actividades_gym_id_fkey";
            columns: ["gym_id"];
            isOneToOne: false;
            referencedRelation: "gyms";
            referencedColumns: ["id"];
          }
        ];
      };
      alumno_actividades: {
        Row: {
          id: string;
          gym_id: string;
          alumno_id: string;
          actividad_id: string;
          monto_personalizado: number | null;
          activa: boolean;
          fecha_inicio: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          alumno_id: string;
          actividad_id: string;
          monto_personalizado?: number | null;
          activa?: boolean;
          fecha_inicio?: string;
        };
        Update: {
          monto_personalizado?: number | null;
          activa?: boolean;
          fecha_inicio?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alumno_actividades_alumno_id_fkey";
            columns: ["alumno_id"];
            isOneToOne: false;
            referencedRelation: "alumnos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alumno_actividades_actividad_id_fkey";
            columns: ["actividad_id"];
            isOneToOne: false;
            referencedRelation: "actividades";
            referencedColumns: ["id"];
          }
        ];
      };
      cuotas: {
        Row: {
          id: string;
          gym_id: string;
          alumno_id: string;
          actividad_id: string | null;
          mes: number;
          anio: number;
          monto_base: number;
          monto_recargo: number;
          monto_total: number;
          estado: "pendiente" | "vencida" | "pagada" | "pagada_parcial" | "condonada";
          fecha_vencimiento: string;
          recargo_aplicado_en: string | null;
          recargo_nivel: number | null;
          mp_preference_id: string | null;
          mp_payment_id: string | null;
          fecha_pago: string | null;
          metodo_pago: string | null;
          pagado_por: string | null;
          avisos_enviados: number;
          ultimo_aviso_en: string | null;
          pago_token: string | null;
          pago_token_expira: string | null;
          tipo: string;
          descripcion: string | null;
          notas: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          alumno_id: string;
          actividad_id?: string | null;
          mes: number;
          anio: number;
          tipo?: string;
          descripcion?: string | null;
          monto_base: number;
          monto_recargo?: number;
          estado?: "pendiente" | "vencida" | "pagada" | "pagada_parcial" | "condonada";
          fecha_vencimiento: string;
          recargo_aplicado_en?: string | null;
          recargo_nivel?: number | null;
          mp_preference_id?: string | null;
          mp_payment_id?: string | null;
          fecha_pago?: string | null;
          metodo_pago?: string | null;
          pagado_por?: string | null;
          avisos_enviados?: number;
          ultimo_aviso_en?: string | null;
          pago_token?: string | null;
          pago_token_expira?: string | null;
          notas?: string | null;
        };
        Update: {
          actividad_id?: string | null;
          tipo?: string;
          descripcion?: string | null;
          monto_base?: number;
          monto_recargo?: number;
          estado?: "pendiente" | "vencida" | "pagada" | "pagada_parcial" | "condonada";
          fecha_vencimiento?: string;
          recargo_aplicado_en?: string | null;
          recargo_nivel?: number | null;
          mp_preference_id?: string | null;
          mp_payment_id?: string | null;
          fecha_pago?: string | null;
          metodo_pago?: string | null;
          pagado_por?: string | null;
          avisos_enviados?: number;
          ultimo_aviso_en?: string | null;
          pago_token?: string | null;
          pago_token_expira?: string | null;
          notas?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cuotas_gym_id_fkey";
            columns: ["gym_id"];
            isOneToOne: false;
            referencedRelation: "gyms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cuotas_alumno_id_fkey";
            columns: ["alumno_id"];
            isOneToOne: false;
            referencedRelation: "alumnos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cuotas_actividad_id_fkey";
            columns: ["actividad_id"];
            isOneToOne: false;
            referencedRelation: "actividades";
            referencedColumns: ["id"];
          }
        ];
      };
      pagos: {
        Row: {
          id: string;
          gym_id: string;
          cuota_id: string;
          alumno_id: string;
          monto: number;
          metodo: string;
          mp_payment_id: string | null;
          mp_status: string | null;
          mp_detail: Json | null;
          registrado_por: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          cuota_id: string;
          alumno_id: string;
          monto: number;
          metodo: string;
          mp_payment_id?: string | null;
          mp_status?: string | null;
          mp_detail?: Json | null;
          registrado_por?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "pagos_gym_id_fkey";
            columns: ["gym_id"];
            isOneToOne: false;
            referencedRelation: "gyms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pagos_cuota_id_fkey";
            columns: ["cuota_id"];
            isOneToOne: false;
            referencedRelation: "cuotas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pagos_alumno_id_fkey";
            columns: ["alumno_id"];
            isOneToOne: false;
            referencedRelation: "alumnos";
            referencedColumns: ["id"];
          }
        ];
      };
      notificaciones_log: {
        Row: {
          id: string;
          gym_id: string;
          alumno_id: string | null;
          cuota_id: string | null;
          tipo: string;
          enviado_a: string | null;
          estado: string | null;
          canal: string;
          provider_id: string | null;
          error_detail: string | null;
          subject: string | null;
          preview: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          alumno_id?: string | null;
          cuota_id?: string | null;
          tipo: string;
          enviado_a?: string | null;
          estado?: string | null;
          canal?: string;
          provider_id?: string | null;
          error_detail?: string | null;
          subject?: string | null;
          preview?: string | null;
          metadata?: Json | null;
        };
        Update: {
          estado?: string | null;
          canal?: string;
          provider_id?: string | null;
          error_detail?: string | null;
          subject?: string | null;
          preview?: string | null;
          metadata?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "notificaciones_log_gym_id_fkey";
            columns: ["gym_id"];
            isOneToOne: false;
            referencedRelation: "gyms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notificaciones_log_alumno_id_fkey";
            columns: ["alumno_id"];
            isOneToOne: false;
            referencedRelation: "alumnos";
            referencedColumns: ["id"];
          }
        ];
      };
      cron_logs: {
        Row: {
          id: string;
          gym_id: string | null;
          tipo: string;
          es_dispatcher: boolean;
          gyms_total: number | null;
          gyms_ok: number | null;
          gyms_error: number | null;
          items_creados: number | null;
          items_saltados: number | null;
          items_error: number | null;
          duracion_ms: number | null;
          error_detalle: string | null;
          triggered_by: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_id?: string | null;
          tipo: string;
          es_dispatcher?: boolean;
          gyms_total?: number | null;
          gyms_ok?: number | null;
          gyms_error?: number | null;
          items_creados?: number | null;
          items_saltados?: number | null;
          items_error?: number | null;
          duracion_ms?: number | null;
          error_detalle?: string | null;
          triggered_by?: string | null;
          metadata?: Json | null;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "cron_logs_gym_id_fkey";
            columns: ["gym_id"];
            isOneToOne: false;
            referencedRelation: "gyms";
            referencedColumns: ["id"];
          }
        ];
      };
      admin_users: {
        Row: {
          id: string;
          email: string;
          nombre: string;
          activo: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          nombre: string;
          activo?: boolean;
        };
        Update: {
          email?: string;
          nombre?: string;
          activo?: boolean;
        };
        Relationships: [];
      };
      admin_settings: {
        Row: {
          id: boolean;
          notification_email: string;
          tipo_cambio_usd: number;
          dias_cobro_antes_vencimiento: number;
          clubio_mp_access_token: string | null;
          plan_basic_precio: number;
          plan_plus_precio: number;
          plan_multi_precio: number;
          moneda_suscripcion: string;
          updated_at: string;
        };
        Insert: {
          id?: boolean;
          notification_email?: string;
          tipo_cambio_usd?: number;
          dias_cobro_antes_vencimiento?: number;
          clubio_mp_access_token?: string | null;
          plan_basic_precio?: number;
          plan_plus_precio?: number;
          plan_multi_precio?: number;
          moneda_suscripcion?: string;
          updated_at?: string;
        };
        Update: {
          notification_email?: string;
          tipo_cambio_usd?: number;
          dias_cobro_antes_vencimiento?: number;
          clubio_mp_access_token?: string | null;
          plan_basic_precio?: number;
          plan_plus_precio?: number;
          plan_multi_precio?: number;
          moneda_suscripcion?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cobros_suscripcion: {
        Row: {
          id: string;
          gym_id: string;
          licencia_id: string;
          periodo: string;
          plan: string;
          monto_usd: number;
          tipo_cambio: number;
          monto_ars: number;
          estado: "pendiente" | "pagado" | "vencido" | "cancelado";
          mp_preference_id: string | null;
          mp_payment_id: string | null;
          link_pago: string | null;
          email_enviado_at: string | null;
          paid_at: string | null;
          renovacion_aplicada: boolean;
          triggered_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          licencia_id: string;
          periodo: string;
          plan: string;
          monto_usd: number;
          tipo_cambio: number;
          monto_ars: number;
          estado?: "pendiente" | "pagado" | "vencido" | "cancelado";
          mp_preference_id?: string | null;
          mp_payment_id?: string | null;
          link_pago?: string | null;
          email_enviado_at?: string | null;
          paid_at?: string | null;
          renovacion_aplicada?: boolean;
          triggered_by?: string;
        };
        Update: {
          estado?: "pendiente" | "pagado" | "vencido" | "cancelado";
          mp_preference_id?: string | null;
          mp_payment_id?: string | null;
          link_pago?: string | null;
          email_enviado_at?: string | null;
          paid_at?: string | null;
          renovacion_aplicada?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cobros_suscripcion_gym_id_fkey";
            columns: ["gym_id"];
            isOneToOne: false;
            referencedRelation: "gyms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cobros_suscripcion_licencia_id_fkey";
            columns: ["licencia_id"];
            isOneToOne: false;
            referencedRelation: "licencias";
            referencedColumns: ["id"];
          }
        ];
      };
      leads: {
        Row: {
          id: string;
          nombre: string;
          email: string;
          telefono: string | null;
          gym_nombre: string | null;
          cantidad_alumnos: string | null;
          como_nos_conocio: string | null;
          estado: string;
          notas: string | null;
          gym_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          email: string;
          telefono?: string | null;
          gym_nombre?: string | null;
          cantidad_alumnos?: string | null;
          como_nos_conocio?: string | null;
          estado?: string;
          notas?: string | null;
          gym_id?: string | null;
        };
        Update: {
          estado?: string;
          notas?: string | null;
          gym_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leads_gym_id_fkey";
            columns: ["gym_id"];
            isOneToOne: false;
            referencedRelation: "gyms";
            referencedColumns: ["id"];
          }
        ];
      };
      admin_logs: {
        Row: {
          id: string;
          admin_id: string | null;
          accion: string;
          gym_id: string | null;
          detalle: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id?: string | null;
          accion: string;
          gym_id?: string | null;
          detalle?: Json | null;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "admin_logs_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_logs_gym_id_fkey";
            columns: ["gym_id"];
            isOneToOne: false;
            referencedRelation: "gyms";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_user_gym_id: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: {
      plan_tipo: "basic" | "plus" | "multi";
      cuota_estado: "pendiente" | "vencida" | "pagada" | "pagada_parcial" | "condonada";
    };
    CompositeTypes: Record<string, never>;
  };
};
