import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

// Ensure browser redirect is handled
WebBrowser.maybeCompleteAuthSession();

const GOOGLE_TASKS_API = 'https://tasks.googleapis.com/tasks/v1';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: GOOGLE_TOKEN_URL,
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

const SCOPES = ['https://www.googleapis.com/auth/tasks.readonly'];

export function getGoogleClientId(): string {
  return process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
}

export function getGoogleClientSecret(): string {
  return process.env.GOOGLE_CLIENT_SECRET || '';
}

/**
 * Create an auth request for Google OAuth2.
 * Must be called as a hook (uses useAuthRequest internally).
 */
export function useGoogleAuth() {
  const clientId = getGoogleClientId();
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'famfi' });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId,
      scopes: SCOPES,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      extraParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
    discovery
  );

  return { request, response, promptAsync, redirectUri };
}

/**
 * Exchange authorization code for tokens.
 */
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token?: string; expires_in: number }> {
  const clientId = getGoogleClientId();

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: getGoogleClientSecret(),
      code,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${text}`);
  }

  return res.json();
}

/**
 * Refresh an expired access token.
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const clientId = getGoogleClientId();

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: getGoogleClientSecret(),
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${text}`);
  }

  return res.json();
}

// ─── Google Tasks API Calls ──────────────────────────────────────────

export interface GoogleTaskList {
  id: string;
  title: string;
  updated: string;
}

export interface GoogleTask {
  id: string;
  title: string;
  status: 'needsAction' | 'completed';
  due?: string;
  completed?: string;
  updated: string;
  notes?: string;
}

/**
 * Fetch all task lists for the authenticated user.
 */
export async function fetchTaskLists(accessToken: string): Promise<GoogleTaskList[]> {
  const res = await fetch(`${GOOGLE_TASKS_API}/users/@me/lists`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch task lists: ${res.status}`);
  }

  const data = await res.json();
  return (data.items || []) as GoogleTaskList[];
}

/**
 * Fetch all tasks in a specific task list.
 */
export async function fetchTasks(
  accessToken: string,
  taskListId: string,
  showCompleted: boolean = true
): Promise<GoogleTask[]> {
  const params = new URLSearchParams({
    maxResults: '100',
    showCompleted: showCompleted.toString(),
    showHidden: 'true',
  });

  const res = await fetch(
    `${GOOGLE_TASKS_API}/lists/${taskListId}/tasks?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch tasks: ${res.status}`);
  }

  const data = await res.json();
  return (data.items || []) as GoogleTask[];
}
