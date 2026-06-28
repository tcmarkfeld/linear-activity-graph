export interface LinearIssue {
  id: string;
  completedAt: string | null;
  assignee: {
    id: string;
    name: string;
    displayName: string;
    email: string;
  } | null;
}

interface ActivityApiResponse {
  issues?: LinearIssue[];
  error?: string;
}

export async function fetchCompletedIssues(completedAfter: Date, completedBefore: Date): Promise<LinearIssue[]> {
  const params = new URLSearchParams({
    completedAfter: completedAfter.toISOString(),
    completedBefore: completedBefore.toISOString(),
  });
  const response = await fetch(`/api/activity?${params.toString()}`);
  const payload = (await response.json()) as ActivityApiResponse;

  if (!response.ok) {
    throw new Error(payload.error ?? `Activity API request failed: ${response.status} ${response.statusText}`);
  }

  return payload.issues ?? [];
}
