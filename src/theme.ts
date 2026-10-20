"use client";

import { createTheme } from "@mui/material/styles";
import { CLIP, N } from "@/design/neon";

/**
 * Neon-arcade theme: near-black navy surfaces, flat neon fills with angular
 * clipped corners, techy display type. Buttons press down a touch when tapped
 * so they still feel physical for young players; glows are reserved for the
 * big moments so the UI never turns into a light show.
 */

/** Flat neon button: angular clip, bright fill, dark text on bright colours. */
function neon(bg: string, text: string) {
  return {
    backgroundColor: bg,
    color: text,
    clipPath: CLIP.button,
    "&:hover": { backgroundColor: bg, filter: "brightness(1.1)" },
    "&:active": { transform: "translateY(3px)" },
    "&.Mui-disabled": {
      backgroundColor: N.panelEdge,
      color: N.textSoft,
    },
  } as const;
}

const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: "dark",
    primary: { main: N.delivery, dark: N.deliveryDeep, contrastText: N.bg },
    secondary: { main: N.pop, dark: N.popDeep, contrastText: N.white },
    success: { main: N.brand, dark: N.brandDeep, contrastText: N.bg },
    warning: { main: N.sun, dark: N.sunDeep, contrastText: N.bg },
    error: { main: N.kitchen, dark: N.kitchenDeep, contrastText: N.white },
    info: { main: N.wordle, dark: N.wordleDeep, contrastText: N.bg },
    background: { default: N.bg, paper: N.panel },
    text: { primary: N.text, secondary: N.textSoft },
    divider: "rgba(234,242,255,0.08)",
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: 'var(--font-body), "Nunito", system-ui, -apple-system, sans-serif',
    // Arcade face for the loudest text; friendly rounded face below it.
    h1: { fontFamily: "var(--font-arcade)", fontWeight: 700, fontSize: "2.4rem", letterSpacing: "0.04em", lineHeight: 1.05, textTransform: "uppercase" as const },
    h2: { fontFamily: "var(--font-arcade)", fontWeight: 700, fontSize: "1.8rem", letterSpacing: "0.04em", lineHeight: 1.1, textTransform: "uppercase" as const },
    h3: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.55rem", lineHeight: 1.15 },
    h4: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.25rem", lineHeight: 1.2 },
    body1: { fontWeight: 600 },
    body2: { fontWeight: 600 },
    caption: { fontWeight: 700 },
    button: { fontFamily: "var(--font-arcade)", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", fontSize: "1rem" },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true, disableRipple: false },
      styleOverrides: {
        root: {
          minHeight: 52,
          paddingInline: 24,
          borderRadius: 0,
          transition: "transform 80ms ease, filter 80ms ease",
        },
        sizeLarge: { minHeight: 60, fontSize: "1.15rem" },
        sizeSmall: { minHeight: 40, fontSize: "0.85rem", paddingInline: 16 },
      },
      variants: [
        { props: { variant: "contained", color: "primary" }, style: neon(N.delivery, N.bg) },
        { props: { variant: "contained", color: "secondary" }, style: neon(N.pop, N.white) },
        { props: { variant: "contained", color: "success" }, style: neon(N.brand, N.bg) },
        { props: { variant: "contained", color: "warning" }, style: neon(N.sun, N.bg) },
        { props: { variant: "contained", color: "error" }, style: neon(N.kitchen, N.white) },
        { props: { variant: "contained", color: "inherit" }, style: neon(N.panelEdge, N.text) },
        {
          // Dark pill with a neon outline: the quiet secondary action.
          props: { variant: "outlined" },
          style: {
            clipPath: CLIP.button,
            backgroundColor: "transparent",
            borderWidth: 1,
            "&:hover": { backgroundColor: "rgba(65,201,255,0.08)", borderWidth: 1 },
            "&:active": { transform: "translateY(2px)" },
            "&.Mui-disabled": { borderWidth: 1, color: N.textSoft },
          },
        },
        {
          props: { variant: "text" },
          style: {
            minHeight: 44,
            "&:hover": { backgroundColor: "rgba(65,201,255,0.08)" },
            "&:active": { transform: "translateY(2px)" },
          },
        },
      ],
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          backgroundColor: N.panel,
          color: N.text,
          border: `1px solid ${N.panelEdge}`,
          transition: "transform 80ms ease, box-shadow 120ms ease",
          "&:hover": { backgroundColor: N.bgRaise, boxShadow: `0 0 10px ${N.delivery}40` },
          "&:active": { transform: "translateY(2px)" },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none", backgroundColor: N.panel },
        rounded: { borderRadius: 14 },
        elevation1: { boxShadow: `0 0 0 1px ${N.panelEdge}, 0 10px 30px rgba(0,0,0,0.45)` },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          backgroundColor: N.panel,
          border: `1px solid ${N.panelEdge}`,
          boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
          overflow: "hidden",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily: "var(--font-arcade)",
          fontWeight: 600,
          height: 32,
          borderRadius: 8,
        },
        filled: { backgroundColor: N.bgRaise, border: `1px solid ${N.panelEdge}` },
        outlined: { borderWidth: 1.5, backgroundColor: "transparent" },
        label: { paddingInline: 12 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: N.bgRaise,
          borderRadius: 10,
          fontWeight: 700,
          fontSize: "1.1rem",
          color: N.text,
          "& .MuiOutlinedInput-notchedOutline": { borderWidth: 2, borderColor: N.panelEdge },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: N.textSoft },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderWidth: 2, borderColor: N.brand },
        },
        input: { paddingBlock: 16 },
      },
    },
    MuiInputLabel: { styleOverrides: { root: { fontWeight: 800, color: N.textSoft, "&.Mui-focused": { color: N.brand } } } },
    MuiFormHelperText: { styleOverrides: { root: { fontWeight: 700, marginLeft: 14 } } },
    MuiTextField: { defaultProps: { variant: "outlined", fullWidth: true } },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 10, fontWeight: 700, border: `1px solid ${N.panelEdge}` },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: N.bgRaise,
          border: `1px solid ${N.panelEdge}`,
          color: N.text,
          fontWeight: 700,
          fontSize: "0.85rem",
          borderRadius: 10,
          padding: "8px 12px",
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontFamily: "var(--font-arcade)",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          fontSize: "0.95rem",
          color: N.textSoft,
          "&.Mui-selected": { color: N.brand },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { backgroundColor: N.brand, height: 3, boxShadow: `0 0 10px ${N.brand}` },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          fontFamily: "var(--font-arcade)",
          fontWeight: 600,
          textTransform: "uppercase",
          borderWidth: 1,
          borderColor: N.panelEdge,
          color: N.textSoft,
          "&.Mui-selected": {
            backgroundColor: N.delivery,
            color: N.bg,
            "&:hover": { backgroundColor: N.deliveryDeep },
          },
        },
      },
    },
  },
});

export default theme;
