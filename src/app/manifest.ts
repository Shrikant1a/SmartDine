import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SmartDine — QR Ordering & Restaurant Management",
    short_name: "SmartDine",
    description:
      "Contactless table QR ordering, Kitchen Display System, Waiter Service, and Restaurant Management.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#d97706",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
