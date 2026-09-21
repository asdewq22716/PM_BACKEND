import { Injectable, Logger } from '@nestjs/common';
import { DbPoolService } from './db-pool.service';
import { QueryBuilderOptions, WhereConditionItem } from './database.interface';

@Injectable()
export class FncDB {
  private readonly logger = new Logger(FncDB.name);

  constructor(private readonly dbPool: DbPoolService) {}

  // =================================================================
  // 🔄 1. Transaction Handling
  // =================================================================

  async startTransaction(): Promise<any> {
    const dbType = this.dbPool.getDbType();

    if (dbType === 'postgres') {
      const client = await this.dbPool.getPgPool().connect();
      await client.query('BEGIN');
      return client;
    } else {
      const connection = await this.dbPool.getMysqlPool().getConnection();
      await connection.beginTransaction();
      return connection;
    }
  }

  async commit(client: any): Promise<void> {
    const dbType = this.dbPool.getDbType();
    try {
      if (dbType === 'postgres') {
        await client.query('COMMIT');
      } else {
        await client.commit();
      }
    } finally {
      this.releaseClient(client);
    }
  }

  async rollback(client: any): Promise<void> {
    const dbType = this.dbPool.getDbType();
    try {
      if (dbType === 'postgres') {
        await client.query('ROLLBACK');
      } else {
        await client.rollback();
      }
    } finally {
      this.releaseClient(client);
    }
  }

  private releaseClient(client: any) {
    try {
      if (typeof client.release === 'function') {
        client.release();
      }
    } catch (err: any) {
      this.logger.error(`Error releasing db client: ${err.message}`);
    }
  }

  // =================================================================
  // ⚡ 2. Raw Execution
  // =================================================================

  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const dbType = this.dbPool.getDbType();

    if (dbType === 'postgres') {
      const pool = this.dbPool.getPgPool();
      const result = await pool.query(text, params);
      return result.rows as T[];
    } else {
      const pool = this.dbPool.getMysqlPool();
      const [rows] = await pool.query(text, params);
      return rows as T[];
    }
  }

  async queryTx<T = any>(
    client: any,
    text: string,
    params?: any[],
  ): Promise<T[]> {
    const dbType = this.dbPool.getDbType();

    if (dbType === 'postgres') {
      const result = await client.query(text, params);
      return result.rows as T[];
    } else {
      const [rows] = await client.query(text, params);
      return rows as T[];
    }
  }

  // =================================================================
  // 🛠️ 3. Query Builder
  // =================================================================

  async queryBuilder<T = any>(options: QueryBuilderOptions): Promise<T[]> {
    let sql = options.select;
    if (options.where) {
      let whereClause = '';
      if (typeof options.where === 'string') {
        whereClause = options.where.trim();
      } else if (Array.isArray(options.where)) {
        whereClause = this.buildWhereFromArray(options.where);
      }
      if (whereClause !== '') {
        sql += ` WHERE ${whereClause}`;
      }
    }
    if (options.orderBy && options.orderBy.trim() !== '') {
      sql += ` ORDER BY ${options.orderBy}`;
    }
    if (options.limit !== undefined && options.limit !== null) {
      sql += ` LIMIT ${options.limit}`;
    }
    if (options.offset !== undefined && options.offset !== null) {
      sql += ` OFFSET ${options.offset}`;
    }

    if (options.debug) {
      this.logger.debug(`[QueryBuilder SQL] ${sql}`);
    }

    return this.query<T>(sql);
  }

  private buildWhereFromArray(whereArr: WhereConditionItem[]): string {
    const clauses: string[] = [];

    for (const cond of whereArr) {
      if (!cond) continue;

      const hasIf = 'if' in cond;
      let isValueValid = false;

      if (hasIf) {
        if (typeof cond.if === 'function') {
          isValueValid = !!cond.if();
        } else if (typeof cond.if === 'boolean') {
          isValueValid = cond.if;
        } else {
          isValueValid =
            cond.if !== undefined && cond.if !== null && cond.if !== '';
        }
      }

      if (!hasIf || isValueValid) {
        if (cond.fill) {
          clauses.push(cond.fill);
        }
      }
    }

    return clauses.join(' AND ');
  }

  escape(val: any): any {
    if (typeof val === 'string') {
      return val.replace(/'/g, "''");
    }
    return val;
  }

  // =================================================================
  // 📦 4. CRUD Helpers
  // =================================================================

  async exists(
    table: string,
    where: Record<string, any>,
    client?: any,
  ): Promise<boolean> {
    const { clause, values } = this.buildWhereClause(where);
    const quote = this.getQuoteChar();
    const sql = `SELECT 1 FROM ${quote}${table}${quote} WHERE ${clause} LIMIT 1`;

    const result = client
      ? await this.queryTx(client, sql, values)
      : await this.query(sql, values);

    return result.length > 0;
  }

  async select<T = any>(
    table: string,
    where?: Record<string, any>,
  ): Promise<T[]> {
    const quote = this.getQuoteChar();
    let sql = `SELECT * FROM ${quote}${table}${quote}`;
    const params: any[] = [];

    if (where && Object.keys(where).length > 0) {
      const { clause, values } = this.buildWhereClause(where);
      sql += ` WHERE ${clause}`;
      params.push(...values);
    }

    return this.query<T>(sql, params);
  }

  async insert<T = any>(
    table: string,
    data: Record<string, any>,
    client?: any,
  ): Promise<T> {
    const dbType = this.dbPool.getDbType();
    const quote = this.getQuoteChar();
    const keys = Object.keys(data);
    const values = Object.values(data);

    const columns = keys.map((k) => `${quote}${k}${quote}`).join(', ');
    const placeholders = keys
      .map((_, i) => (dbType === 'postgres' ? `$${i + 1}` : '?'))
      .join(', ');

    let sql = `INSERT INTO ${quote}${table}${quote} (${columns}) VALUES (${placeholders})`;

    if (dbType === 'postgres') {
      sql += ` RETURNING *`;
      const rows = client
        ? await this.queryTx(client, sql, values)
        : await this.query(sql, values);
      return rows[0];
    } else {
      const result: any = client
        ? await client.query(sql, values)
        : await this.dbPool.getMysqlPool().query(sql, values);
      const insertId = result[0]?.insertId;
      return { id: insertId, ...data } as unknown as T;
    }
  }

  async update(
    table: string,
    data: Record<string, any>,
    where: Record<string, any>,
    client?: any,
  ): Promise<number> {
    const dbType = this.dbPool.getDbType();
    const quote = this.getQuoteChar();
    const updateKeys = Object.keys(data);
    const updateValues = Object.values(data);

    const setClause = updateKeys
      .map((k, i) => `${quote}${k}${quote} = ${dbType === 'postgres' ? `$${i + 1}` : '?'}`)
      .join(', ');

    const { clause: whereClause, values: whereValues } = this.buildWhereClause(
      where,
      updateKeys.length + 1,
    );

    const sql = `UPDATE ${quote}${table}${quote} SET ${setClause} WHERE ${whereClause}`;
    const allValues = [...updateValues, ...whereValues];

    if (dbType === 'postgres') {
      const result = client
        ? await client.query(sql, allValues)
        : await this.dbPool.getPgPool().query(sql, allValues);
      return result.rowCount || 0;
    } else {
      const [result]: any = client
        ? await client.query(sql, allValues)
        : await this.dbPool.getMysqlPool().query(sql, allValues);
      return result.affectedRows || 0;
    }
  }

  async delete(
    table: string,
    where: Record<string, any>,
    client?: any,
  ): Promise<number> {
    const dbType = this.dbPool.getDbType();
    const quote = this.getQuoteChar();
    const { clause, values } = this.buildWhereClause(where);
    const sql = `DELETE FROM ${quote}${table}${quote} WHERE ${clause}`;

    if (dbType === 'postgres') {
      const result = client
        ? await client.query(sql, values)
        : await this.dbPool.getPgPool().query(sql, values);
      return result.rowCount || 0;
    } else {
      const [result]: any = client
        ? await client.query(sql, values)
        : await this.dbPool.getMysqlPool().query(sql, values);
      return result.affectedRows || 0;
    }
  }

  // =================================================================
  // 🧩 5. Private Helpers
  // =================================================================

  private getQuoteChar(): string {
    return this.dbPool.getDbType() === 'postgres' ? '"' : '`';
  }

  private buildWhereClause(where: Record<string, any>, startIndex = 1) {
    const dbType = this.dbPool.getDbType();
    const quote = this.getQuoteChar();
    const keys = Object.keys(where);
    const values = Object.values(where);

    const clause = keys
      .map((k, i) => `${quote}${k}${quote} = ${dbType === 'postgres' ? `$${startIndex + i}` : '?'}`)
      .join(' AND ');

    return {
      clause,
      values,
      nextIndex: startIndex + keys.length,
    };
  }
}
