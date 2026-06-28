import type { IncomingMessage, ServerResponse } from "node:http";
import { fetchCompletedIssuesFromLinear, LinearApiError } from "./linear";

interface ActivityResponse {
  issues?: Awaited<ReturnType<typeof fetchCompletedIssuesFromLinear>>;
  error?: string;
}

export function createActivityHandler(apiKey: string) {
  return async function activityHandler(request: IncomingMessage, response: ServerResponse) {
    if (request.method !== "GET") {
      sendJson(response, 405, { error: "Method not allowed." });
      return;
    }

    try {
      assertConfigured(apiKey);

      const url = new URL(request.url ?? "/", "http://localhost");
      const completedAfterValue = url.searchParams.get("completedAfter");
      const completedBeforeValue = url.searchParams.get("completedBefore");
      const completedAfter = completedAfterValue ? new Date(completedAfterValue) : null;
      const completedBefore = completedBeforeValue ? new Date(completedBeforeValue) : null;

      if (!completedAfter || Number.isNaN(completedAfter.valueOf())) {
        throw new LinearApiError("Invalid completedAfter date.", 400);
      }

      if (!completedBefore || Number.isNaN(completedBefore.valueOf())) {
        throw new LinearApiError("Invalid completedBefore date.", 400);
      }

      if (completedAfter > completedBefore) {
        throw new LinearApiError("Start date must be before or equal to end date.", 400);
      }

      const issues = await fetchCompletedIssuesFromLinear(apiKey, completedAfter, completedBefore);
      sendJson(response, 200, { issues });
    } catch (error) {
      const status = error instanceof LinearApiError ? error.status : 500;
      const message = error instanceof Error ? error.message : "Unknown server error.";
      sendJson(response, status, { error: message });
    }
  };
}

function assertConfigured(apiKey: string) {
  if (!apiKey) {
    throw new LinearApiError("Missing LINEAR_API_KEY in .env.", 400);
  }
}

function sendJson(response: ServerResponse, status: number, payload: ActivityResponse) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}
