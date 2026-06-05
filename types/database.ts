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
          whatsapp_activo: boolean;
          whatsapp_phone_number_id: string | null;
          whatsapp_access_token: string | null;
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
          whatsapp_activo?: boolean;
          whatsapp_phone_number_id?: string | null;
          whatsapp_access_token?: string | null;
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
          whatsapp_activo?: boolean;
          whatsapp_phone_number_id?: string | null;
          whatsapp_access_token?: string | null;
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
          rol: "owner" | "admin" | "recepcion";
          activo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          gym_id: string;
          nombre: string;
          rol?: "owner" | "admin" | "recepcion";
          activo?: boolean;
        };
        Update: {
          nombre?: string;
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
      cuotas: {
        Row: {
          id: string;
          gym_id: string;
          alumno_id: string;
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
          notas: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          alumno_id: string;
          mes: number;
          anio: number;
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
          enviado: boolean;
          estado: string | null;
          canal: string;
          provider_id: string | null;
          error_detail: string | null;
          resend_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          alumno_id?: string | null;
          cuota_id?: string | null;
          tipo: string;
          enviado_a?: string | null;
          enviado?: boolean;
          estado?: string | null;
          canal?: string;
          provider_id?: string | null;
          error_detail?: string | null;
          resend_id?: string | null;
        };
        Update: {
          enviado?: boolean;
          estado?: string | null;
          canal?: string;
          provider_id?: string | null;
          error_detail?: string | null;
          resend_id?: string | null;
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
