import { NextRequest, NextResponse } from "next/server";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export async function POST(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Google OAuth is not configured." }, { status: 500 });
  }

  const body = await request.json().catch(() => null) as {
    code?: string;
    codeVerifier?: string;
    redirectUri?: string;
  } | null;

  if (!body?.code || !body.codeVerifier || !body.redirectUri) {
    return NextResponse.json({ error: "Missing authorization code or PKCE verifier." }, { status: 400 });
  }

  if (!isAllowedRedirectUri(request, body.redirectUri)) {
    return NextResponse.json({ error: "Invalid redirect URI." }, { status: 400 });
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: body.code,
      code_verifier: body.codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: body.redirectUri,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    return NextResponse.json(
      { error: payload.error_description || payload.error || "Google token exchange failed." },
      { status: response.status },
    );
  }

  return NextResponse.json({
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_in: payload.expires_in,
  });
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
