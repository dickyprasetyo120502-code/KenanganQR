import dotenv from "dotenv";
dotenv.config();
import { PrismaClient } from "@prisma/client";

// Ensure BigInt can be serialized to JSON in Express res.json()
if (!BigInt.prototype.toJSON) {
  BigInt.prototype.toJSON = function () {
    const num = Number(this);
    return Number.isSafeInteger(num) ? num : this.toString();
  };
}

let rawDbUrl = (process.env.DATABASE_URL || "").trim();

// Pastikan parameter pgbouncer=true jika menggunakan connection pooler Supabase (port 6543)
if (rawDbUrl.includes(":6543") && !rawDbUrl.includes("pgbouncer=true")) {
  rawDbUrl += (rawDbUrl.includes("?") ? "&" : "?") + "pgbouncer=true";
  process.env.DATABASE_URL = rawDbUrl;
}

const isPrismaConfigured = Boolean(
  rawDbUrl &&
  !rawDbUrl.includes("[YOUR-PASSWORD]") &&
  (rawDbUrl.startsWith("postgresql://") || rawDbUrl.startsWith("postgres://"))
);

let prisma = null;

if (isPrismaConfigured) {
  prisma = new PrismaClient({
    datasources: {
      db: { url: rawDbUrl },
    },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
  console.log("💎 [Prisma] Prisma Client siap & terhubung dengan PostgreSQL.");
} else {
  console.warn("⚠️ [Prisma] DATABASE_URL belum diisi dengan password database di .env. Menggunakan Supabase Client sebagai fallback.");
}

export { prisma, isPrismaConfigured };
export default prisma;
