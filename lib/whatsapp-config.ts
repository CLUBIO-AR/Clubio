// Cuándo consideramos que un gym "tiene WhatsApp": canal activo + número + token.
// Se usa para mostrar/ocultar el inbox de WhatsApp en el menú y en la configuración.
export type WhatsappConfigMin = {
  whatsapp_activo?: boolean | null;
  whatsapp_phone_number_id?: string | null;
  whatsapp_access_token?: string | null;
};

export function whatsappConfigurado(config: WhatsappConfigMin | null | undefined): boolean {
  return !!(config?.whatsapp_activo && config.whatsapp_phone_number_id && config.whatsapp_access_token);
}
