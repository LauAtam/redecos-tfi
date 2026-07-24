import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  let httpsOptions: any = undefined;
  try {
    if (!process.env.RENDER) {
      const keyPath = path.join(process.cwd(), 'ssl', 'key.pem');
      const certPath = path.join(process.cwd(), 'ssl', 'cert.pem');
      if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        httpsOptions = {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath),
        };
        console.log('🔒 HTTPS habilitado en el servidor de NestJS (Local)');
      }
    } else {
      console.log('☁️ Entorno Render detectado: Delegano SSL al proveedor (HTTP local)');
    }
  } catch (error) {
    console.warn('⚠️ No se pudieron cargar los certificados SSL, iniciando en HTTP', error);
  }

  const app = await NestFactory.create(AppModule, {
    ...(httpsOptions ? { httpsOptions } : {}),
  });

  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('Redeco API')
    .setDescription('Core operation backend for Redeco project')
    .setVersion('1.0')
    .addTag('nodes', 'Withdrawal nodes management')
    .addTag('products', 'Product catalog management')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
