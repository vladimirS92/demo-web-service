import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

// Origins the browser is allowed to call this API from.
// Always allowed: the local Angular dev server and the deployed demo frontend.
// Add more (or override for another deployment) via the FRONTEND_ORIGIN env var,
// which accepts a comma-separated list. Trailing slashes are ignored.
function allowedOrigins(): string[] {
  const trim = (o: string) => o.trim().replace(/\/+$/, '');
  return [
    'http://localhost:4200',
    'https://demo-web-service-fe.onrender.com',
    ...(process.env.FRONTEND_ORIGIN ?? '').split(','),
  ]
    .map(trim)
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // All routes are served under /api  (e.g. http://localhost:3000/api/projects)
  app.setGlobalPrefix('api');

  const origins = allowedOrigins();
  // `enableCors` takes a union of option shapes, so TypeScript cannot infer the
  // callback's parameter types from context - they are annotated explicitly.
  type OriginCallback = (err: Error | null, allow: boolean) => void;
  app.enableCors({
    origin: (origin: string | undefined, callback: OriginCallback) => {
      // No Origin header = not a browser request (curl, Swagger UI, health checks) -> allow.
      if (!origin || origins.includes(origin.replace(/\/+$/, ''))) {
        callback(null, true);
        return;
      }
      // Send no CORS headers, so the browser blocks it (instead of a 500).
      console.warn(`CORS: blocked origin ${origin}`);
      callback(null, false);
    },
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
  console.log(`Allowed browser origins:      ${origins.join(', ')}`);
}
bootstrap();
