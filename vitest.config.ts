import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["__tests__/setup.ts"],
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", ".next/", "__tests__/"],
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./") },
  },
});
