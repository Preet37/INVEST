import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Invest",
    short_name: "Invest",
    description: "Swap endless scrolling for 5 minutes that make you sharper.",
    start_url: "/",
    display: "standalone",
    background_color: "#0c1110",
    theme_color: "#0c1110",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
