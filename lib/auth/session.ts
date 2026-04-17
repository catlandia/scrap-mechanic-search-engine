import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "smse_admin";

export interface AdminSession {
  isAdmin?: boolean;
}

export function buildSessionOptions(password: string): SessionOptions {
  return {
    cookieName: SESSION_COOKIE_NAME,
    password,
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
    },
  };
}

function requireSecret(): string {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set and at least 32 characters long (see .env.example).",
    );
  }
  return password;
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  return getIronSession<AdminSession>(cookieStore, buildSessionOptions(requireSecret()));
}
