import mysql from 'mysql2/promise'

const dbConfig = {
  host: '45.45.239.13',
  port: 3306,
  user: 'auratictactoe_user',
  password: 'TicTacToeAura2010@',
  database: 'auratictactoe',
  connectionLimit: 10,
}

let pool: mysql.Pool | null = null

export async function getConnection() {
  if (!pool) {
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