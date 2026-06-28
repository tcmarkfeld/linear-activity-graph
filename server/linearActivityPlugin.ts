import process from "node:process";
import type { Plugin } from "vite";
import { loadEnv } from "vite";
import { createActivityHandler } from "./activityApi";

const ACTIVITY_API_PATH = "/api/activity";

export function linearActivityPlugin(): Plugin {
  let apiKey = "";

  return {
    name: "linear-activity-api",
    configResolved(config) {
      const env = loadEnv(config.mode, process.cwd(), "");
      apiKey = normalizeApiKey(env.LINEAR_API_KEY ?? env.VITE_LINEAR_API_KEY ?? "");
    },
    configureServer(server) {
      server.middlewares.use(ACTIVITY_API_PATH, createActivityHandler(apiKey));
    },
  };
}

function normalizeApiKey(apiKey: string): string {
  return apiKey.trim().replace(/^["']|["']$/g, "");
}
