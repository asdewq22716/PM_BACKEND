import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Database Tools
import { DbPoolService } from './database/db-pool.service';
import { FncDB } from './database/fnc-db.service';

// HTTP Tools
import { BaseApiService } from './http/base-api.service';

// Auth Tools
import { JwtStrategy } from './auth/strategies/jwt.strategy';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from './auth/guards/optional-jwt-auth.guard';

@Global()
@Module({
  imports: [
    HttpModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') ||
          'pm_backend_fallback_secret_key',
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRES_IN') || '1d') as any,
        },
      }),
    }),
  ],
  providers: [
    DbPoolService,
    FncDB,
    BaseApiService,
    JwtStrategy,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
  ],
  exports: [
    DbPoolService,
    FncDB,
    BaseApiService,
    JwtStrategy,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
    HttpModule,
    PassportModule,
    JwtModule,
  ],
})
export class ToolsAkModule {}
