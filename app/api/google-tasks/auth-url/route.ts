import { NextRequest, NextResponse } from "next/server";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPES = ["https://www.googleapis.com/auth/tasks.readonly"];

export async function POST(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Google OAuth is not configured." }, { status: 500 });
  }

  const body = await request.json().catch(() => null) as {
    codeChallenge?: string;
    redirectUri?: string;
    state?: string;
  } | null;

  if (!body?.codeChallenge || !body.redirectUri || !body.state) {
    return NextResponse.json({ error: "Missing PKCE challenge or redirect URI." }, { status: 400 });
  }

  if (!isAllowedRedirectUri(request, body.redirectUri)) {
    return NextResponse.json({ error: "Invalid redirect URI." }, { status: 400 });
  }

  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", body.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPES.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("code_challenge", body.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", body.state);

  return NextResponse.json({ url: url.toString() });
}

function isAllowedRedirectUri(request: NextRequest, redirectUri: string) {
  try {
    const requestOrigin = new URL(request.url).origin;
    const parsedRedirect = new URL(redirectUri);
    return parsedRedirect.origin === requestOrigin && parsedRedirect.pathname === "/google-tasks";
  } catch {
    return false;
  }
}
