import { Pool } from "pg";

const isProd = process.env.NODE_ENV === "production";
const connectionString = process.env.DATABASE_URL || process.env.DB_URL;

const pool = new Pool(
  connectionString
    ? {
        connectionString,
        ssl: isProd ? { rejectUnauthorized: false } : undefined,
      }
    : {
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "root",
        database: process.env.DB_NAME || "honjar",
        ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
      }
);

export default pool;
