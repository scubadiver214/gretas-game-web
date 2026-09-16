"use client";

import { createTheme } from "@mui/material/styles";
import { C, RADIUS, floatShadow, hardShadow, pressedShadow } from "@/design/tokens";

/**
 * Hyper-casual pizza-shop theme: flat saturated colour, sand-and-blue palette,
 * fat rounded corners and buttons that sit on a solid bottom edge so they read
 * as physical plastic. No gradients, no thin type.
 */

/** Chunky "sticker" button: solid edge below, presses down when tapped. */
function chunky(bg: string, edge: string, text: string = C.white) {
  return {
    backgroundColor: bg,
    color: text,
    boxShadow: hardShadow(edge),
    "&:hover": { backgroundColor: bg, boxShadow: hardShadow(edge) },
    "&:active": { transform: "translateY(4px)", boxShadow: pressedShadow(edge) },
    "&.Mui-disabled": {
      backgroundColor: C.slate,
      color: C.inkSoft,
      boxShadow: hardShadow(C.slateDeep, 4),
    },
  } as const;
}

const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: "light",
    primary: { main: C.blue, dark: C.blueDeep, light: C.blueSoft, contrastText: C.white },
    secondary: { main: C.tomato, dark: C.tomatoDeep, contrastText: C.white },
    success: { main: C.money, dark: C.moneyDeep, contrastText: C.white },
    warning: { main: C.sun, dark: C.sunDeep, contrastText: C.ink },
    error: { main: C.tomato, dark: C.tomatoDeep, contrastText: C.white },
    background: { default: C.sandSoft, paper: C.white },
    text: { primary: C.ink, secondary: C.inkSoft },
    divider: "rgba(22,33,46,0.10)",
  },
  shape: { borderRadius: RADIUS.tile },
  typography: {
    fontFamily: 'var(--font-body), "Nunito", system-ui, -apple-system, sans-serif',
    // Display face for anything the eye should land on first.
    h1: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "2.6rem", letterSpacing: "-0.01em", lineHeight: 1.05 },
    h2: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "2rem", lineHeight: 1.1 },
    h3: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.55rem", lineHeight: 1.15 },
    h4: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.25rem", lineHeight: 1.2 },
    body1: { fontWeight: 600 },
    body2: { fontWeight: 600 },
    caption: { fontWeight: 700 },
    button: { fontFamily: "var(--font-display)", fontWeight: 800, textTransform: "none", fontSize: "1.1rem" },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true, disableRipple: false },
      styleOverrides: {
        root: {
          minHeight: 54,
          paddingInline: 24,
          borderRadius: RADIUS.pill,
          transition: "transform 80ms ease, box-shadow 80ms ease",
        },
        sizeLarge: { minHeight: 62, fontSize: "1.25rem" },
        sizeSmall: { minHeight: 42, fontSize: "0.95rem", paddingInline: 16 },
      },
      variants: [
        { props: { variant: "contained", color: "primary" }, style: chunky(C.blue, C.blueDeep) },
        { props: { variant: "contained", color: "secondary" }, style: chunky(C.tomato, C.tomatoDeep) },
        { props: { variant: "contained", color: "success" }, style: chunky(C.money, C.moneyDeep) },
        { props: { variant: "contained", color: "warning" }, style: chunky(C.sun, C.sunDeep, C.ink) },
        { props: { variant: "contained", color: "inherit" }, style: chunky(C.white, C.sandDeep, C.ink) },
        {
          // White pill with a coloured outline: the quiet secondary action.
          props: { variant: "outlined" },
          style: {
            backgroundColor: C.white,
            borderWidth: 3,
            boxShadow: hardShadow("rgba(22,33,46,0.14)", 5),
            "&:hover": { backgroundColor: C.sandSoft, borderWidth: 3 },
            "&:active": { transform: "translateY(3px)", boxShadow: pressedShadow("rgba(22,33,46,0.14)") },
            "&.Mui-disabled": { borderWidth: 3, backgroundColor: C.slate, boxShadow: "none" },
          },
        },
        {
          props: { variant: "text" },
          style: {
            minHeight: 44,
            "&:hover": { backgroundColor: "rgba(46,141,239,0.08)" },
            "&:active": { transform: "translateY(2px)" },
          },
        },
      ],
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          backgroundColor: C.white,
          color: C.ink,
          boxShadow: floatShadow,
          transition: "transform 80ms ease",
          "&:hover": { backgroundColor: C.sandSoft },
          "&:active": { transform: "translateY(3px)" },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
        rounded: { borderRadius: RADIUS.panel },
        elevation1: { boxShadow: floatShadow },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: RADIUS.panel, boxShadow: floatShadow, overflow: "hidden" },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          height: 34,
          borderRadius: RADIUS.pill,
        },
        filled: { boxShadow: "0 2px 0 rgba(22,33,46,0.12)" },
        outlined: { borderWidth: 2.5, backgroundColor: C.white },
        label: { paddingInline: 12 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: C.white,
          borderRadius: RADIUS.tile,
          fontWeight: 700,
          fontSize: "1.1rem",
          "& .MuiOutlinedInput-notchedOutline": { borderWidth: 3, borderColor: C.sandDeep },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: C.blueSoft },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderWidth: 3 },
        },
        input: { paddingBlock: 18 },
      },
    },
    MuiInputLabel: { styleOverrides: { root: { fontWeight: 800 } } },
    MuiFormHelperText: { styleOverrides: { root: { fontWeight: 700, marginLeft: 14 } } },
    MuiTextField: { defaultProps: { variant: "outlined", fullWidth: true } },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: RADIUS.tile, fontWeight: 700, boxShadow: floatShadow },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { backgroundColor: C.ink, fontWeight: 700, fontSize: "0.85rem", borderRadius: 12, padding: "8px 12px" },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          textTransform: "none",
          fontSize: "1.05rem",
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          textTransform: "none",
          borderWidth: 2.5,
          "&.Mui-selected": { backgroundColor: C.blue, color: C.white, "&:hover": { backgroundColor: C.blueDeep } },
        },
      },
    },
  },
});

export default theme;
