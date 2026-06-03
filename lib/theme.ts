// Tokens de color centralizados — actualizar acá para cambiar el tema globalmente
export const T = {
  // Fondos — navy azulado, no negro puro
  bgDeep:   "oklch(0.12 0.04 250)",      // sidebar
  bg:       "oklch(0.17 0.04 250)",      // fondo principal
  card:     "oklch(0.21 0.035 250)",     // cards
  cardHover:"oklch(0.25 0.032 250)",     // hover
  inputBg:  "oklch(0.19 0.035 250)",     // inputs

  // Bordes
  border:    "oklch(0.28 0.03 250)",
  borderSub: "oklch(0.23 0.03 250)",

  // Textos
  text:     "oklch(0.91 0.008 240)",     // blanco levemente azulado — menos duro que puro blanco
  textMuted:"oklch(0.60 0.02 245)",
  textDim:  "oklch(0.42 0.02 245)",

  // Acento — esmeralda suave, nada de neon
  accent:        "oklch(0.76 0.15 163)",          // #2dcc96 — verde esmeralda
  accentBg:      "oklch(0.76 0.15 163 / 0.12)",
  accentBorder:  "oklch(0.76 0.15 163 / 0.28)",
  accentGlow:    "0 0 18px oklch(0.76 0.15 163 / 0.22)",
  accentText:    "oklch(0.12 0.04 250)",           // texto sobre fondo accent

  // Semánticos
  danger:  "oklch(0.65 0.19 27)",
  warning: "oklch(0.80 0.15 85)",
  lime:    "oklch(0.76 0.18 135)",
  blue:    "oklch(0.65 0.15 220)",
} as const;
