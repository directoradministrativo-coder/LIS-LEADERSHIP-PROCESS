import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { verifyLocalSessionToken } from "./auth-local";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { parse as parseCookieHeader } from "cookie";
import { COOKIE_NAME } from "../../shared/const.js";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

async function getUserFromLocalToken(token: string): Promise<User | null> {
  const payload = await verifyLocalSessionToken(token);
  if (!payload) return null;

  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
  if (result.length === 0) return null;

  // Update lastSignedIn
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, payload.userId));
  return result[0];
}

function extractToken(req: CreateExpressContextOptions["req"]): string | undefined {
  // Check Authorization header first
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }

  // Check cookie
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const parsed = parseCookieHeader(cookieHeader);
    return parsed[COOKIE_NAME];
  }

  return undefined;
}

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const token = extractToken(opts.req);

    if (token) {
      // Try local JWT first (faster, no external call)
      user = await getUserFromLocalToken(token);

      // If local JWT failed, try Manus OAuth (for backward compatibility)
      if (!user) {
        try {
          user = await sdk.authenticateRequest(opts.req);
        } catch {
          user = null;
        }
      }
    }
  } catch (error) {
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
