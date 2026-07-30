// Tokens de color centralizados — actualizar acá para cambiar el tema globalmente
// Paleta CLUBIO: fondo blanco, sidebar violeta oscuro, acentos violeta/lima.
// NOTA: los hex de accent/lime están tomados a ojo de las piezas de marca —
// confirmar contra el brand book / Figma antes de un rollout final.
export const T = {
  // Fondos
  bgDeep:   "#160B33",      // sidebar — violeta muy oscuro (se mantiene oscuro por diseño)
  bg:       "#FFFFFF",      // fondo principal — blanco
  card:     "#FFFFFF",      // cards
  cardHover:"#F6F4FC",      // hover
  inputBg:  "#F8F7FC",      // inputs

  // Bordes
  border:    "#E4E0F1",
  borderSub: "#EDEBF7",

  // Textos — para superficies claras (bg, card, inputBg)
  text:     "#16112B",      // casi negro con tinte violeta
  textMuted:"#6B647F",
  textDim:  "#9A93AC",

  // Textos — para superficies que se mantienen oscuras a propósito
  // (sidebar sobre bgDeep, login/registro, pantallas de /pagar, skeletons oscuros)
  textOnDark:      "#F5F3FC",   // casi blanco — headings/valores sobre bgDeep
  textOnDarkMuted: "#B6AAD6",   // texto secundario sobre bgDeep
  textOnDarkDim:   "#8579A8",   // texto terciario/íconos inactivos sobre bgDeep
  borderOnDark:    "#2A1B5C",   // separadores sutiles sobre bgDeep

  // Acento — violeta CLUBIO
  accent:        "#7C3AED",
  accentBg:      "rgba(124, 58, 237, 0.10)",
  accentBorder:  "rgba(124, 58, 237, 0.28)",
  accentGlow:    "0 0 18px rgba(124, 58, 237, 0.25)",
  accentText:    "#FFFFFF",           // texto sobre fondo accent (violeta)

  // Semánticos
  danger:  "oklch(0.65 0.19 27)",
  warning: "oklch(0.80 0.15 85)",
  lime:    "#D7FF3D",        // segundo acento de marca — usar con texto oscuro encima
  limeText:"#16112B",        // texto sobre fondo lime
  blue:    "oklch(0.65 0.15 220)",
} as const;
