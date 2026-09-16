import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Greta's Game for fun",
    short_name: "Greta's Game",
    description: "Make pizzas in the kitchen or deliver them by bike. Play with friends on the global scoreboard!",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FDF4DA",
    theme_color: "#2E8DEF",
    categories: ["games", "kids"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
