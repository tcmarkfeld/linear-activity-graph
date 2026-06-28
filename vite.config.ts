import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { linearActivityPlugin } from "./server/linearActivityPlugin";

export default defineConfig({
  plugins: [linearActivityPlugin(), react()],
});
