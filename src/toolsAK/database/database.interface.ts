export type DatabaseType = 'postgres' | 'mysql';

export interface DbConnectionConfig {
  type: DatabaseType;
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  ssl?: boolean;
}

export interface QueryBuilderOptions {
  select: string;
  where?: string | any[];
  orderBy?: string;
  limit?: number;
  offset?: number;
  debug?: boolean;
}

export interface WhereConditionItem {
  if?: boolean | (() => boolean) | any;
  fill?: string;
}
