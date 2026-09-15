"use client";

import { createTheme } from "@mui/material/styles";

/**
 * Bright, kid-friendly theme. Big touch targets, rounded corners, and a
 * pizza-inspired palette (tomato red, cheese yellow, basil green).
 */
const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: "light",
    primary: { main: "#F2542D", contrastText: "#FFFFFF" },
    secondary: { main: "#0E9594", contrastText: "#FFFFFF" },
    success: { main: "#3FA34D" },
    warning: { main: "#F5B700" },
    background: { default: "#FFF7EC", paper: "#FFFFFF" },
    text: { primary: "#2B2D42", secondary: "#5C5F7A" },
  },
  shape: { borderRadius: 18 },
  typography: {
    fontFamily:
      '"Nunito", "Avenir Next", "Segoe UI", system-ui, -apple-system, sans-serif',
    h1: { fontWeight: 900, fontSize: "2.4rem", letterSpacing: "-0.02em" },
    h2: { fontWeight: 900, fontSize: "1.9rem" },
    h3: { fontWeight: 800, fontSize: "1.5rem" },
    h4: { fontWeight: 800, fontSize: "1.25rem" },
    button: { fontWeight: 800, textTransform: "none", fontSize: "1.05rem" },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { minHeight: 52, paddingInline: 22, borderRadius: 999 },
        sizeLarge: { minHeight: 60, fontSize: "1.2rem" },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 24, boxShadow: "0 10px 30px rgba(43,45,66,0.10)" },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 700 } },
    },
    MuiTextField: {
      defaultProps: { variant: "outlined", fullWidth: true },
    },
  },
});

export default theme;
