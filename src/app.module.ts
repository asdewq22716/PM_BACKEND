import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ToolsAkModule } from './toolsAK';
import { UploadsModule } from './modules/uploads';
import { SimpleBannersModule } from './modules/simple-banners';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
      serveRoot: '/',
      renderPath: '/public',
    }),
    ToolsAkModule,
    UploadsModule,
    SimpleBannersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

