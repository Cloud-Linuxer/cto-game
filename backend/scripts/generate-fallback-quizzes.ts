import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { LLMQuizGeneratorService } from '../src/quiz/services/llm-quiz-generator.service';
import { QuizValidatorService } from '../src/quiz/validators/quiz-validator.service';
import { QuizQualityScorerService } from '../src/quiz/services/quiz-quality-scorer.service';
import { QuizDifficulty, QuizType } from '../src/database/entities/quiz.entity';
import * as fs from 'fs';
import * as path from 'path';

interface FallbackQuiz {
  type: QuizType;
  difficulty: QuizDifficulty;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  infraContext: string[];
  qualityScore: number;
  turnRange: string;
}

async function generateFallbackQuizzes() {
  console.log('Starting fallback quiz generation...\n');

  const app = await NestFactory.createApplicationContext(AppModule);

  const llmGenerator = app.get(LLMQuizGeneratorService);
  const validator = app.get(QuizValidatorService);
  const scorer = app.get(QuizQualityScorerService);

  const quizzes: FallbackQuiz[] = [];

  // Infrastructure contexts by difficulty
  const contexts = {
    EASY: [
      ['EC2'],
      ['EC2', 'S3'],
      ['EC2', 'RDS'],
      ['EC2', 'CloudFront'],
      ['S3', 'CloudFront'],
      ['S3'],
      ['RDS'],
      ['CloudFront'],
      ['VPC'],
      ['IAM'],
    ],
    MEDIUM: [
      ['Aurora', 'EC2'],
      ['ALB', 'EC2', 'AutoScaling'],
      ['Aurora', 'Redis'],
      ['CloudFront', 'S3', 'ALB'],
      ['Aurora', 'Multi-AZ'],
      ['ElastiCache', 'EC2'],
      ['CloudWatch', 'EC2'],
      ['Route53', 'ALB'],
      ['VPC', 'Aurora'],
      ['Lambda', 'API Gateway'],
    ],
    HARD: [
      ['EKS', 'Karpenter'],
      ['Aurora Global DB'],
      ['EKS', 'ALB', 'Aurora'],
      ['Multi-region', 'Aurora Global DB'],
      ['EKS', 'Bedrock', 'Aurora'],
      ['CloudFront', 'Aurora Global DB', 'Multi-region'],
      ['EKS', 'SageMaker'],
      ['Glue', 'Athena', 'QuickSight'],
      ['Kinesis', 'Lambda'],
      ['ECS', 'Fargate'],
    ],
  };

  // Generate quizzes
  const targets = [
    { difficulty: QuizDifficulty.EASY, count: 40, turnRange: '1-10' },
    { difficulty: QuizDifficulty.MEDIUM, count: 40, turnRange: '11-20' },
    { difficulty: QuizDifficulty.HARD, count: 20, turnRange: '21-25' },
  ];

  for (const target of targets) {
    console.log(`\nGenerating ${target.count} ${target.difficulty} quizzes...`);
    console.log('='.repeat(60));

    let generated = 0;
    let attempts = 0;
    const maxAttempts = target.count * 3; // Allow retries

    while (generated < target.count && attempts < maxAttempts) {
      attempts++;

      try {
        // Random infrastructure context
        const contextPool = contexts[target.difficulty];
        const infraContext = contextPool[Math.floor(Math.random() * contextPool.length)];

        // Generate quiz
        const quiz = await llmGenerator.generateQuiz(target.difficulty, infraContext);

        // Validate
        const validation = await validator.validate(quiz);
        if (!validation.isValid) {
          console.log(`  Validation failed (attempt ${attempts}): ${validation.errors.join(', ')}`);
          continue;
        }

        // Score quality (minimum 70 for fallback pool)
        const score = await scorer.scoreQuiz(quiz, infraContext);
        if (score.total < 70) {
          console.log(`  Low quality score: ${score.total}/100 (attempt ${attempts})`);
          continue;
        }

        // Add to collection
        quizzes.push({
          type: quiz.type,
          difficulty: quiz.difficulty,
          question: quiz.question,
          options: quiz.options,
          correctAnswer: quiz.correctAnswer,
          explanation: quiz.explanation,
          infraContext: quiz.infraContext,
          qualityScore: score.total,
          turnRange: target.turnRange,
        });

        generated++;
        const percentage = ((generated / target.count) * 100).toFixed(1);
        console.log(`  Generated ${generated}/${target.count} (${percentage}%) - Quality: ${score.total}/100 - Type: ${quiz.type}`);

      } catch (error) {
        console.error(`  Generation error (attempt ${attempts}): ${error.message}`);
      }
    }

    if (generated < target.count) {
      console.warn(`\nWarning: Only generated ${generated}/${target.count} ${target.difficulty} quizzes`);
    } else {
      console.log(`\nSuccessfully generated all ${target.count} ${target.difficulty} quizzes`);
    }
  }

  // Save to file
  const outputPath = path.join(__dirname, '../data/fallback-quizzes.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(quizzes, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log(`Successfully generated ${quizzes.length} fallback quizzes`);
  console.log(`Saved to: ${outputPath}`);
  console.log('='.repeat(60));

  // Statistics
  const stats = {
    total: quizzes.length,
    byDifficulty: {
      EASY: quizzes.filter(q => q.difficulty === QuizDifficulty.EASY).length,
      MEDIUM: quizzes.filter(q => q.difficulty === QuizDifficulty.MEDIUM).length,
      HARD: quizzes.filter(q => q.difficulty === QuizDifficulty.HARD).length,
    },
    byType: {
      MULTIPLE_CHOICE: quizzes.filter(q => q.type === QuizType.MULTIPLE_CHOICE).length,
      OX: quizzes.filter(q => q.type === QuizType.OX).length,
    },
    qualityScores: {
      average: (quizzes.reduce((sum, q) => sum + q.qualityScore, 0) / quizzes.length).toFixed(1),
      min: Math.min(...quizzes.map(q => q.qualityScore)),
      max: Math.max(...quizzes.map(q => q.qualityScore)),
    },
  };

  console.log('\nStatistics:');
  console.log('-'.repeat(60));
  console.log(`Total Quizzes: ${stats.total}`);
  console.log(`\nBy Difficulty:`);
  console.log(`  EASY:   ${stats.byDifficulty.EASY}`);
  console.log(`  MEDIUM: ${stats.byDifficulty.MEDIUM}`);
  console.log(`  HARD:   ${stats.byDifficulty.HARD}`);
  console.log(`\nBy Type:`);
  console.log(`  MULTIPLE_CHOICE: ${stats.byType.MULTIPLE_CHOICE}`);
  console.log(`  OX:              ${stats.byType.OX}`);
  console.log(`\nQuality Scores:`);
  console.log(`  Average: ${stats.qualityScores.average}/100`);
  console.log(`  Range:   ${stats.qualityScores.min}-${stats.qualityScores.max}`);
  console.log('='.repeat(60));

  await app.close();
}

generateFallbackQuizzes()
  .then(() => {
    console.log('\nGeneration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nGeneration failed:', error);
    process.exit(1);
  });
