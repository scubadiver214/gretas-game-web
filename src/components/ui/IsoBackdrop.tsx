import Box from "@mui/material/Box";
import { C } from "@/design/tokens";

/**
 * The shop floor seen on every menu screen: green lawn at the top, a blue curb
 * edge, then a speckled sand floor. Purely decorative and always behind
 * content, which is why it never renders anything interactive.
 */
export default function IsoBackdrop() {
  return (
    <Box
      aria-hidden
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        overflow: "hidden",
        bgcolor: C.sand,
        // Sand speckle + a soft diagonal sheen across the floor.
        backgroundImage: `radial-gradient(rgba(22,33,46,0.055) 1.5px, transparent 1.6px),
          repeating-linear-gradient(48deg, rgba(255,255,255,0.10) 0 22px, rgba(255,255,255,0) 22px 54px)`,
        backgroundSize: "26px 26px, auto",
      }}
    >
      {/* Lawn beyond the shop, with the blue curb the whole street is edged in. */}
      <Box
        sx={{
          position: "absolute",
          top: -70,
          left: "-8%",
          width: "116%",
          height: 250,
          bgcolor: C.grass,
          borderRadius: "0 0 46% 46% / 0 0 70px 70px",
          borderBottom: `14px solid ${C.blue}`,
          boxShadow: "0 12px 26px rgba(22,33,46,0.16)",
        }}
      />
      {/* Blue floor plate in the bottom corner, like the counters in the shop. */}
      <Box
        sx={{
          position: "absolute",
          bottom: -140,
          right: -110,
          width: 320,
          height: 320,
          borderRadius: "42%",
          bgcolor: C.blue,
          opacity: 0.14,
        }}
      />
      <Box
        sx={{
          position: "absolute",
          bottom: -90,
          left: -120,
          width: 260,
          height: 260,
          borderRadius: "44%",
          bgcolor: C.crust,
          opacity: 0.16,
        }}
      />
    </Box>
  );
}
