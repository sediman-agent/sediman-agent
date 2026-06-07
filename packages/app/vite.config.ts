import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  // Use relative paths for Electron compatibility
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@sediman/server": path.resolve(__dirname, "../server/src"),
    },
  },
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    target: "chrome105",
    minify: !process.env.DEBUG ? "esbuild" : false,
    sourcemaps: !!process.env.DEBUG,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        'ui-docs': path.resolve(__dirname, 'ui-docs.html'),
      },
    },
  },
  envPrefix: ["VITE_"],
});
