import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Blow Fitness - Gym Operations & Management System",
    short_name: "Blow Fitness",
    description: "Modern athletic center operations, locker management, front-desk check-in, and point of sale terminal.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#1e3a8a",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/icon.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
