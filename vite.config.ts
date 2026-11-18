import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { careerSearchPlugin } from "./server/discovery.mjs";

export default defineConfig({
  plugins: [react(), careerSearchPlugin()],
});
