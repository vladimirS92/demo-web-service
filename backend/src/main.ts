import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // All routes are served under /api  (e.g. http://localhost:3000/api/projects)
  app.setGlobalPrefix('api');

  // Allow the Angular dev server to call this API
  app.enableCors({
    origin: ['http://localhost:4200', process.env.FRONTEND_ORIGIN || ''].filter(Boolean),
    credentials: true,
  });

  // Validate every incoming request body against its DTO
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  // Auto-generated OpenAPI docs at http://localhost:3000/api/docs
  const config = new DocumentBuilder()
    .setTitle('SecureScan API')
    .setDescription('Demo corporate security scanning service')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
  console.log(`SecureScan backend running on http://localhost:${port}`);
  console.log(`Swagger docs:                 http://localhost:${port}/api/docs`);
}
bootstrap();
