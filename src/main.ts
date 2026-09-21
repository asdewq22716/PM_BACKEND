import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe, Logger } from '@nestjs/common';
import {
  AllExceptionsFilter,
  TransformInterceptor,
} from './toolsAK';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';

process.env.TZ = 'Asia/Bangkok';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // 1. Enable CORS
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.use(cookieParser());

  // 2. Request body size limit
  app.use(json({ limit: '100mb' }));
  app.use(urlencoded({ extended: true, limit: '100mb' }));

  // 3. Global Prefix (/api)
  app.setGlobalPrefix('api');

  // 4. Swagger Documentation (/api/docs)
  const config = new DocumentBuilder()
    .setTitle('PM Backend API (Powered by ToolsAK)')
    .setDescription('Project Management Backend System API with Universal ToolsAK Toolbox')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'กรอก JWT Token สำหรับยืนยันตัวตน',
        in: 'header',
      },
      'bearer',
    )
    .addSecurityRequirements('bearer')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // 5. Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 6. Global Exception Filters & Response Interceptors (ToolsAK)
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const port = process.env.PORT || 4722;
  await app.listen(port, '0.0.0.0');

  const appUrl = await app.getUrl();
  logger.log(`🚀 Application is running on: ${appUrl}`);
  logger.log(`📡 API Base URL            : ${appUrl}/api`);
  logger.log(`📖 Swagger API Docs        : ${appUrl}/api/docs`);
  logger.log(`===========================================`);
  logger.log(`NODE_ENV    : ${process.env.NODE_ENV || 'development'}`);
  logger.log(`DB_TYPE     : ${process.env.DB_TYPE || 'postgres'}`);
  logger.log(`DB_HOST     : ${process.env.DB_HOST || 'localhost'}`);
  logger.log(`DB_NAME     : ${process.env.DB_NAME || 'pm_db'}`);
  logger.log(`TOOLKIT     : ToolsAK (Universal Toolbox)`);
  logger.log(`===========================================`);
}

bootstrap();
