/**
 * Sistema de autenticación propio con email + contraseña.
 * Reemplaza el OAuth de Manus para funcionar en cualquier servidor (Railway, etc.)
 */
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { Express, Request, Response } from "express";
import { getAuthorizedUserByEmail, getDb } from "../db";
import { authorizedUsers, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { getSessionCookieOptions } from "./cookies";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const.js";

const SALT_ROUNDS = 10;

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? "fallback-secret-change-in-production";
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createLocalSessionToken(userId: number, email: string, role: string): Promise<string> {
  const secretKey = getJwtSecret();
  return new SignJWT({ userId, email, role, type: "local" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(Math.floor((Date.now() + ONE_YEAR_MS) / 1000))
    .sign(secretKey);
}

export async function verifyLocalSessionToken(token: string): Promise<{ userId: number; email: string; role: string } | null> {
  try {
    const secretKey = getJwtSecret();
    const { payload } = await jwtVerify(token, secretKey, { algorithms: ["HS256"] });
    const { userId, email, role, type } = payload as Record<string, unknown>;
    if (type !== "local" || typeof userId !== "number" || typeof email !== "string" || typeof role !== "string") {
      return null;
    }
    return { userId, email, role };
  } catch {
    return null;
  }
}

/**
 * Get or create a user in the `users` table based on an authorizedUser.
 * The `users` table is the one used by the rest of the app (protectedProcedure, etc.)
 */
async function syncLocalUserToUsersTable(authUser: {
  id: number;
  email: string;
  name: string;
  role: "user" | "admin" | "superadmin";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Use email as openId for local users (unique identifier)
  const openId = `local:${authUser.email}`;

  // Upsert into users table
  await db.insert(users).values({
    openId,
    name: authUser.name,
    email: authUser.email,
    loginMethod: "password",
    role: authUser.role,
    lastSignedIn: new Date(),
  }).onDuplicateKeyUpdate({
    set: {
      name: authUser.name,
      role: authUser.role,
      lastSignedIn: new Date(),
    },
  });

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0] ?? null;
}

export function registerLocalAuthRoutes(app: Express) {
  /**
   * POST /api/auth/login
   * Body: { email: string, password: string }
   */
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      res.status(400).json({ error: "Email y contraseña son requeridos" });
      return;
    }

    try {
      const authUser = await getAuthorizedUserByEmail(email.trim().toLowerCase());

      if (!authUser) {
        res.status(401).json({ error: "Credenciales inválidas" });
        return;
      }

      if (!authUser.passwordHash) {
        res.status(401).json({ error: "Este usuario no tiene contraseña configurada. Contacte al administrador." });
        return;
      }

      const valid = await verifyPassword(password, authUser.passwordHash);
      if (!valid) {
        res.status(401).json({ error: "Credenciales inválidas" });
        return;
      }

      // Sync to users table and get the user record
      const user = await syncLocalUserToUsersTable({
        id: authUser.id,
        email: authUser.email,
        name: authUser.name,
        role: authUser.role,
      });

      if (!user) {
        res.status(500).json({ error: "Error al crear sesión de usuario" });
        return;
      }

      // Create session token
      const sessionToken = await createLocalSessionToken(user.id, user.email ?? authUser.email, user.role);

      // Set cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({
        success: true,
        user: {
          id: user.id,
          openId: user.openId,
          name: user.name,
          email: user.email,
          role: user.role,
          loginMethod: "password",
          lastSignedIn: user.lastSignedIn?.toISOString() ?? new Date().toISOString(),
        },
        app_session_id: sessionToken,
      });
    } catch (error) {
      console.error("[LocalAuth] Login failed:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  /**
   * POST /api/auth/set-password  (admin only - sets password for an authorized user)
   * Body: { email: string, password: string }
   */
  app.post("/api/auth/set-password", async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      res.status(400).json({ error: "Email y contraseña son requeridos" });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
      return;
    }

    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const authUser = await getAuthorizedUserByEmail(email.trim().toLowerCase());
      if (!authUser) {
        res.status(404).json({ error: "Usuario no encontrado" });
        return;
      }

      const passwordHash = await hashPassword(password);
      await db.update(authorizedUsers)
        .set({ passwordHash, isEnrolled: true, enrolledAt: new Date() })
        .where(eq(authorizedUsers.id, authUser.id));

      res.json({ success: true });
    } catch (error) {
      console.error("[LocalAuth] Set password failed:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });
}
