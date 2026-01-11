import mysql from "mysql2/promise"

type DbConfig = {
  host: string
  port: number
  user: string
  password: string
  database: string
  connectionLimit: number
  ssl?: mysql.PoolOptions["ssl"]
}

function getDbConfig(): DbConfig {
  const url = process.env.DATABASE_URL
  const sslEnabled = String(process.env.DB_SSL || "").toLowerCase() === "true"
  const sslCa = process.env.DB_SSL_CA

  if (url) {
    const parsed = new URL(url)
    return {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 3306,
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, ""),
      connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
      ssl: sslEnabled
        ? {
            rejectUnauthorized: true,
            ...(sslCa ? { ca: sslCa } : null),
          }
        : undefined,
    }
  }

  const host = process.env.DB_HOST
  const user = process.env.DB_USER
  const password = process.env.DB_PASSWORD
  const database = process.env.DB_NAME
  const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306

  if (!host || !user || !password || !database) {
    throw new Error(
      "Missing database environment variables. Set DATABASE_URL or DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME.",
    )
  }

  return {
    host,
    port,
    user,
    password,
    database,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    ssl: sslEnabled
      ? {
          rejectUnauthorized: true,
          ...(sslCa ? { ca: sslCa } : null),
        }
      : undefined,
  }
}

let pool: mysql.Pool | null = null

export async function getConnection() {
  if (!pool) {
    const dbConfig = getDbConfig()
    pool = mysql.createPool(dbConfig)
  }
  return pool.getConnection()
}

export async function query(sql: string, params: any[] = []) {
  const connection = await getConnection()
  try {
    const [rows] = await connection.execute(sql, params)
    return rows
  } finally {
    connection.release()
  }
}