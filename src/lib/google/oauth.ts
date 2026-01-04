import { google } from "googleapis";

export function googleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI!; 
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}
