import { PrismaClient } from "@prisma/client";

// Supabase session pooler on port 5432 or direct
const connectionString = "postgresql://postgres.ycolgjbvndtnbzwvfata:Rahayujaya2010@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres";

const prisma = new PrismaClient({
  datasources: {
    db: { url: connectionString }
  }
});

async function main() {
  try {
    console.log("Connecting to Supabase...");
    await prisma.$executeRawUnsafe(`ALTER TABLE public.galleries ADD COLUMN IF NOT EXISTS user_email TEXT;`);
    console.log("SUCCESS: user_email column added to galleries table!");
  } catch (err) {
    console.error("Error adding column:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
