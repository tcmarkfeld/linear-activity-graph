export interface LinearUser {
  id: string;
  name: string;
  displayName: string;
  email: string;
}

export interface LinearIssue {
  id: string;
  completedAt: string | null;
  assignee: LinearUser | null;
}

interface IssuesPageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

interface IssuesResponse {
  data?: {
    issues: {
      nodes: LinearIssue[];
      pageInfo: IssuesPageInfo;
    };
  };
  errors?: LinearError[];
}

interface LinearError {
  message: string;
}

export class LinearApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "LinearApiError";
  }
}

const LINEAR_API_URL = "https://api.linear.app/graphql";
const PAGE_SIZE = 250;
const AUTHENTICATION_ERROR = "not authenticated";

const COMPLETED_ISSUES_QUERY = `
  query CompletedIssues($after: String, $completedAfter: DateTimeOrDuration!, $completedBefore: DateTimeOrDuration!) {
    issues(
      first: ${PAGE_SIZE}
      after: $after
      filter: {
        completedAt: { gte: $completedAfter, lte: $completedBefore }
      }
    ) {
      nodes {
        id
        completedAt
        assignee {
          id
          name
          displayName
          email
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export async function fetchCompletedIssuesFromLinear(
  apiKey: string,
  completedAfter: Date,
  completedBefore: Date,
): Promise<LinearIssue[]> {
  const issues: LinearIssue[] = [];
  let after: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const data = await linearRequest(apiKey, {
      query: COMPLETED_ISSUES_QUERY,
      variables: {
        after,
        completedAfter: completedAfter.toISOString(),
        completedBefore: completedBefore.toISOString(),
      },
    });
    const page = data.issues;

    issues.push(...page.nodes);
    after = page.pageInfo.endCursor;
    hasNextPage = page.pageInfo.hasNextPage;
  }

  return issues;
}

async function linearRequest(
  apiKey: string,
  body: { query: string; variables: { after: string | null; completedAfter: string; completedBefore: string } },
): Promise<NonNullable<IssuesResponse["data"]>> {
  const response = await fetch(LINEAR_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as IssuesResponse;

  if (payload.errors?.length) {
    const message = payload.errors.map((error) => error.message).join("\n");
    const status = message.toLowerCase().includes(AUTHENTICATION_ERROR) ? 401 : 400;

    throw new LinearApiError(message, status);
  }

  if (!response.ok) {
    throw new LinearApiError(`Linear API request failed with status ${response.status}.`, response.status);
  }

  if (!payload.data) {
    throw new LinearApiError("Linear API response missing data.", 502);
  }

  return payload.data;
}
