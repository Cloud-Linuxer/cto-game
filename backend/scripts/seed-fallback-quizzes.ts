import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Repository } from 'typeorm';
import { Quiz, QuizSource, QuizDifficulty } from '../src/database/entities/quiz.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';

async function seedFallbackQuizzes() {
  console.log('Starting fallback quiz seeding...\n');

  const app = await NestFactory.createApplicationContext(AppModule);

  const quizRepository = app.get<Repository<Quiz>>(getRepositoryToken(Quiz));

  // Load quizzes from file
  const filePath = path.join(__dirname, '../data/fallback-quizzes.json');

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found at ${filePath}`);
    console.error('Please run "npm run quiz:generate" first to generate fallback quizzes.');
    await app.close();
    process.exit(1);
  }

  const quizData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  console.log(`Loading ${quizData.length} fallback quizzes from ${filePath}...`);
  console.log('='.repeat(60));

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const data of quizData) {
    try {
      // Parse turn range
      const turnRangeParts = data.turnRange.split('-');
      const turnRangeStart = parseInt(turnRangeParts[0], 10);
      const turnRangeEnd = parseInt(turnRangeParts[1], 10);

      const quiz = quizRepository.create({
        type: data.type,
        difficulty: data.difficulty,
        question: data.question,
        options: data.options,
        correctAnswer: data.correctAnswer,
        explanation: data.explanation,
        infraContext: data.infraContext,
        turnRangeStart,
        turnRangeEnd,
        source: QuizSource.FALLBACK,
        qualityScore: data.qualityScore,
        usageCount: 0,
        correctAnswerCount: 0,
        totalAnswerCount: 0,
        isActive: true,
      });

      await quizRepository.save(quiz);
      imported++;

      if (imported % 10 === 0) {
        const percentage = ((imported / quizData.length) * 100).toFixed(1);
        console.log(`  Imported ${imported}/${quizData.length} (${percentage}%)`);
      }
    } catch (error) {
      errors++;
      console.error(`  Import failed for quiz "${data.question.substring(0, 50)}...": ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Successfully imported ${imported}/${quizData.length} fallback quizzes`);
  if (errors > 0) {
    console.log(`Errors: ${errors}`);
  }
  console.log('='.repeat(60));

  // Verify database state
  console.log('\nVerifying database state...');
  const totalQuizzes = await quizRepository.count();
  const fallbackQuizzes = await quizRepository.count({ where: { source: QuizSource.FALLBACK } });
  const easyQuizzes = await quizRepository.count({ where: { source: QuizSource.FALLBACK, difficulty: QuizDifficulty.EASY } });
  const mediumQuizzes = await quizRepository.count({ where: { source: QuizSource.FALLBACK, difficulty: QuizDifficulty.MEDIUM } });
  const hardQuizzes = await quizRepository.count({ where: { source: QuizSource.FALLBACK, difficulty: QuizDifficulty.HARD } });

  console.log('\nDatabase Statistics:');
  console.log('-'.repeat(60));
  console.log(`Total quizzes in DB:     ${totalQuizzes}`);
  console.log(`Fallback quizzes:        ${fallbackQuizzes}`);
  console.log(`  EASY:                  ${easyQuizzes}`);
  console.log(`  MEDIUM:                ${mediumQuizzes}`);
  console.log(`  HARD:                  ${hardQuizzes}`);
  console.log('='.repeat(60));

  await app.close();
}

seedFallbackQuizzes()
  .then(() => {
    console.log('\nSeeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nSeeding failed:', error);
    process.exit(1);
  });
