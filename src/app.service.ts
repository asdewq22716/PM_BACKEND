import { Injectable } from '@nestjs/common';
import { DbPoolService } from './toolsAK';

@Injectable()
export class AppService {
  constructor(private readonly dbPool: DbPoolService) {}

  getHealthStatus() {
    const isDbConnected = this.dbPool.isDbConnected();
    const dbType = this.dbPool.getDbType();
    const connectionError = this.dbPool.getConnectionError();

    return {
      name: 'PM_BACKEND API',
      status: 'online',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      toolbox: 'ToolsAK (Universal Toolkit)',
      database: {
        type: dbType,
        connected: isDbConnected,
        status: isDbConnected
          ? `Connected to ${dbType.toUpperCase()}`
          : 'Ready / Standby (Not connected yet or offline)',
        error: isDbConnected ? null : connectionError,
      },
    };
  }
}
