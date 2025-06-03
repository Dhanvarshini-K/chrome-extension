import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "popup.html"),
        background: resolve(__dirname, "src/background.ts"),
        content: resolve(__dirname, "src/content.ts"),
        inject: resolve(__dirname, "src/inject.ts"),
        readLocalStorage: resolve(__dirname, "src/readLocalStorage.ts"),
        clickSources: resolve(__dirname, "src/clickSources.ts")

      },
      output: {
        entryFileNames: (assetInfo) => {
          if (assetInfo.name === "background") return "background.js";
          if (assetInfo.name === "content") return "content.js";
          if (assetInfo.name === "inject") return "inject.js";
          return "[name].js";
        },
      },
    },
    outDir: "dist",
    emptyOutDir: true,
  },
});
