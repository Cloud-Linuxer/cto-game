import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

async function seedDatabase(app: any) {
  const dataSource = app.get(DataSource);

  // Ensure schema is synchronized
  await dataSource.synchronize(false);

  // Check if database is already seeded
  try {
    const turnCount = await dataSource.query('SELECT COUNT(*) as count FROM turns');
    if (turnCount[0].count > 0) {
      console.log('✅ Database already seeded');
      return;
    }
  } catch (error) {
    console.log('📊 Database tables ready, starting seed...');
  }

  console.log('📊 Seeding database...');
  const gameData = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../game_choices_db.json'), 'utf8')
  );

  for (const turnData of gameData) {
    // Insert turn - PostgreSQL uses $1, $2, $3
    await dataSource.query(
      'INSERT INTO turns ("turnNumber", "eventText", description) VALUES ($1, $2, $3)',
      [turnData.turn, turnData.event, '']
    );

    // Insert choices - PostgreSQL uses $1, $2, etc
    for (const choiceData of turnData.choices) {
      await dataSource.query(
        `INSERT INTO choices (
          "choiceId", "turnNumber", text, effects, "nextTurn", category, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          choiceData.id,
          turnData.turn,
          choiceData.text,
          JSON.stringify(choiceData.effects),
          choiceData.next_turn || turnData.turn + 1,
          '',
          ''
        ]
      );
    }
  }

  console.log(`✅ Seeded ${gameData.length} turns with ${gameData.reduce((s, t) => s + t.choices.length, 0)} choices`);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 설정
  app.enableCors({
    origin: [
      'http://localhost:3001',
      'http://localhost:3000',
      'https://verified-queen-seating-das.trycloudflare.com',
      'https://receipt-photographers-sorry-flip.trycloudflare.com',
      'https://bird-photographic-faqs-group.trycloudflare.com',
      'https://fleece-newport-angeles-appliance.trycloudflare.com',
      'https://information-strongly-restored-characters.trycloudflare.com',
      'https://engine-opponent-realistic-collaboration.trycloudflare.com',
    ],
    credentials: true,
  });

  // 글로벌 Exception Filter 설정
  app.useGlobalFilters(new AllExceptionsFilter());

  // 글로벌 Validation Pipe 설정
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // API 프리픽스 설정
  app.setGlobalPrefix('api');

  // Swagger 문서 설정
  const config = new DocumentBuilder()
    .setTitle('AWS CTO Game API')
    .setDescription('AWS 스타트업 타이쿤 게임 백엔드 API')
    .setVersion('1.0')
    .addTag('game', '게임 관리 API')
    .addTag('turn', '턴 정보 API')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs available at: http://localhost:${port}/api-docs`);

  // Seed database AFTER app has fully started
  try {
    await seedDatabase(app);
  } catch (error) {
    console.error('⚠️  Seed error:', error.message);
  }
}

bootstrap();
