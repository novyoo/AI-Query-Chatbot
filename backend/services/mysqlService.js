import mysql from 'mysql2/promise';

let adminPool = null;
const dbPools = new Map();

function getAdminPool() {
  if (!adminPool) {
    adminPool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      waitForConnections: true,
      connectionLimit: 5,
    });
  }
  return adminPool;
}

function getDbPool(dbName) {
  if (!dbPools.has(dbName)) {
    dbPools.set(
      dbName,
      mysql.createPool({
        host: process.env.MYSQL_HOST,
        port: Number(process.env.MYSQL_PORT || 3306),
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: dbName,
        waitForConnections: true,
        connectionLimit: 5,
      })
    );
  }
  return dbPools.get(dbName);
}

export async function createDatabase(dbName) {
  const pool = getAdminPool();
  await pool.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
}

export async function dropDatabase(dbName) {
  const pool = getAdminPool();
  await pool.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
  dbPools.delete(dbName);
}

export function splitStatements(sql) {
  const statements = [];
  let current = '';
  let inString = null;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (inString) {
      current += ch;
      if (ch === inString && sql[i - 1] !== '\\') inString = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      inString = ch;
      current += ch;
      continue;
    }
    if (ch === ';') {
      if (current.trim()) statements.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}

export async function runStatements(dbName, sql) {
  const pool = getDbPool(dbName);
  const statements = splitStatements(sql);
  const results = [];
  for (const stmt of statements) {
    const [rows] = await pool.query(stmt);
    results.push(rows);
  }
  return results;
}

export async function runQuery(dbName, sql, params = []) {
  const pool = getDbPool(dbName);
  const [rows, fields] = await pool.query(sql, params);
  return { rows, fields };
}

export async function createTable(dbName, tableName, columns) {
  const pool = getDbPool(dbName);
  const defs = columns.map((c) => {
    let def = `\`${c.name}\` ${c.type}`;
    if (c.isPrimaryKey) {
      def += /INT/i.test(c.type) ? ' AUTO_INCREMENT PRIMARY KEY' : ' PRIMARY KEY';
    }
    return def;
  });
  await pool.query(`CREATE TABLE \`${tableName}\` (${defs.join(', ')})`);
}

export async function dropTable(dbName, tableName) {
  const pool = getDbPool(dbName);
  await pool.query(`DROP TABLE IF EXISTS \`${tableName}\``);
}

export async function listTables(dbName) {
  const pool = getDbPool(dbName);
  const [rows] = await pool.query(
    `SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = ?`,
    [dbName]
  );
  return rows.map((r) => r.TABLE_NAME || r.table_name);
}

export async function getTableSchema(dbName, tableName) {
  const pool = getDbPool(dbName);
  const [rows] = await pool.query(`DESCRIBE \`${tableName}\``);
  return rows.map((r) => ({
    name: r.Field,
    type: r.Type,
    isPrimaryKey: r.Key === 'PRI',
    nullable: r.Null === 'YES',
  }));
}

export async function getTableRows(dbName, tableName, limit = 200) {
  const pool = getDbPool(dbName);
  const [rows] = await pool.query(`SELECT * FROM \`${tableName}\` LIMIT ?`, [limit]);
  return rows;
}

export async function insertRow(dbName, tableName, rowData) {
  const pool = getDbPool(dbName);
  const cols = Object.keys(rowData);
  if (!cols.length) throw new Error('No columns provided');
  const placeholders = cols.map(() => '?').join(', ');
  const colList = cols.map((c) => `\`${c}\``).join(', ');
  const [result] = await pool.query(
    `INSERT INTO \`${tableName}\` (${colList}) VALUES (${placeholders})`,
    cols.map((c) => rowData[c])
  );
  return result;
}

export async function updateRow(dbName, tableName, primaryKeyCol, primaryKeyValue, rowData) {
  const pool = getDbPool(dbName);
  const cols = Object.keys(rowData).filter((c) => c !== primaryKeyCol);
  if (!cols.length) return { affectedRows: 0 };
  const setClause = cols.map((c) => `\`${c}\` = ?`).join(', ');
  const [result] = await pool.query(
    `UPDATE \`${tableName}\` SET ${setClause} WHERE \`${primaryKeyCol}\` = ?`,
    [...cols.map((c) => rowData[c]), primaryKeyValue]
  );
  return result;
}

export async function deleteRow(dbName, tableName, primaryKeyCol, primaryKeyValue) {
  const pool = getDbPool(dbName);
  const [result] = await pool.query(`DELETE FROM \`${tableName}\` WHERE \`${primaryKeyCol}\` = ?`, [
    primaryKeyValue,
  ]);
  return result;
}
