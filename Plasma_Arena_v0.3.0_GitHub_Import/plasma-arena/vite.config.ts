import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    rollupOptions: {
      output: {
        format: "iife",
        inlineDynamicImports: true,
        entryFileNames: "game.js",
        name: "PlasmaArenaBundle",
      },
    },
  },
});
