import "server-only";

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

import * as schema from "@/db/schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Falta configurar DATABASE_URL en las variables de entorno.");
}

export const pool = mysql.createPool({ uri: databaseUrl,
  ...(process.env.DATABASE_SSL_CA || process.env.DATABASE_TLS_REQUIRED === '1' ? { ssl: { ...(process.env.DATABASE_SSL_CA ? {ca: process.env.DATABASE_SSL_CA.replace(/\\n/g, '\n')} : {}), rejectUnauthorized: true, verifyIdentity: true } } : {}),
  connectionLimit: 5,
});

export const db = drizzle(pool, { schema, mode: "default" });
