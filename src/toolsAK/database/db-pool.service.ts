import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool as PgPool, PoolClient as PgClient } from 'pg';
import * as mysql from 'mysql2/promise';
import { DatabaseType } from './database.interface';

@Injectable()
export class DbPoolService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DbPoolService.name);

  public readonly dbType: DatabaseType;
  private pgPool: PgPool | null = null;
  private mysqlPool: mysql.Pool | null = null;
  private connected: boolean = false;
  private connectionError: string | null = null;

  constructor(private readonly configService: ConfigService) {
    const type = (this.configService.get<string>('DB_TYPE') || 'postgres').toLowerCase();
    this.dbType = type === 'mysql' ? 'mysql' : 'postgres';

    const host = this.configService.get<string>('DB_HOST') || 'localhost';
    const port = Number(this.configService.get<number>('DB_PORT')) || (this.dbType === 'mysql' ? 3306 : 5432);
    const user = this.configService.get<string>('DB_USER') || 'postgres';
    const password = this.configService.get<string>('DB_PASSWORD') || '';
    const database = this.configService.get<string>('DB_NAME') || 'pm_db';
    const ssl = this.configService.get<string>('DB_SSL') === 'true';

    this.logger.log(
      `[Database] Initializing ${this.dbType.toUpperCase()} Pool: host=${host}, port=${port}, user=${user}, db=${database}`,
    );

    try {
      if (this.dbType === 'postgres') {
        this.pgPool = new PgPool({
          host,
          port,
          user,
          password,
          database,
          max: 20,
          ssl: ssl ? { rejectUnauthorized: false } : undefined,
        });
      } else {
        this.mysqlPool = mysql.createPool({
          host,
          port,
          user,
          password,
          database,
          waitForConnections: true,
          connectionLimit: 20,
          queueLimit: 0,
          ssl: ssl ? { rejectUnauthorized: false } : undefined,
        });
      }
    } catch (err: any) {
      this.connectionError = err.message;
      this.logger.error(`[Database] Failed to create ${this.dbType} pool: ${err.message}`);
    }
  }

  async onModuleInit() {
    try {
      if (this.dbType === 'postgres' && this.pgPool) {
        const client = await this.pgPool.connect();
        await client.query('SELECT 1');
        client.release();
        this.connected = true;
        this.logger.log(`✅ [Database] PostgreSQL connected successfully!`);
      } else if (this.dbType === 'mysql' && this.mysqlPool) {
        const conn = await this.mysqlPool.getConnection();
        await conn.query('SELECT 1');
        conn.release();
        this.connected = true;
        this.logger.log(`✅ [Database] MySQL connected successfully!`);
      }
    } catch (error: any) {
      this.connected = false;
      this.connectionError = error.message;
      this.logger.warn(
        `⚠️ [Database] Could not establish connection to ${this.dbType.toUpperCase()} database (${error.message}). App running in offline/ready state.`,
      );
    }
  }

  async onModuleDestroy() {
    try {
      if (this.pgPool) {
        await this.pgPool.end();
        this.logger.log('[Database] PostgreSQL connection pool closed');
      }
      if (this.mysqlPool) {
        await this.mysqlPool.end();
        this.logger.log('[Database] MySQL connection pool closed');
      }
    } catch (err: any) {
      this.logger.error(`[Database] Error while closing pool: ${err.message}`);
    }
  }

  isDbConnected(): boolean {
    return this.connected;
  }

  getDbType(): DatabaseType {
    return this.dbType;
  }

  getConnectionError(): string | null {
    return this.connectionError;
  }

  getPgPool(): PgPool {
    if (!this.pgPool) throw new Error('PostgreSQL Pool is not initialized');
    return this.pgPool;
  }

  getMysqlPool(): mysql.Pool {
    if (!this.mysqlPool) throw new Error('MySQL Pool is not initialized');
    return this.mysqlPool;
  }
}
