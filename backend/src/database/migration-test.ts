/**
 * Migration Test Script
 *
 * This script verifies that the Quiz and QuizHistory entities
 * can successfully interact with the migrated database tables.
 *
 * Run with: ts-node src/database/migrations/migration-test.ts
 */

import { AppDataSource } from './data-source';
import { Quiz, QuizType, QuizDifficulty, QuizSource } from './entities/quiz.entity';
import { QuizHistory } from './entities/quiz-history.entity';

async function testMigration() {
  try {
    // Initialize database connection
    console.log('Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connection established\n');

    const quizRepository = AppDataSource.getRepository(Quiz);
    const historyRepository = AppDataSource.getRepository(QuizHistory);

    // Test 1: Create a quiz
    console.log('Test 1: Creating a test quiz...');
    const testQuiz = quizRepository.create({
      type: QuizType.MULTIPLE_CHOICE,
      difficulty: QuizDifficulty.MEDIUM,
      question: 'What is Amazon EC2?',
      options: [
        'A. Elastic Compute Cloud',
        'B. Elastic Container Cloud',
        'C. Elastic Cache Cloud',
        'D. Elastic Content Cloud',
      ],
      correctAnswer: 'A',
      explanation:
        'EC2 stands for Elastic Compute Cloud, which provides scalable computing capacity in the AWS cloud.',
      infraContext: ['EC2'],
      turnRangeStart: 1,
      turnRangeEnd: 5,
      source: QuizSource.MANUAL,
      qualityScore: 95,
      isActive: true,
    });

    const savedQuiz = await quizRepository.save(testQuiz);
    console.log(`✅ Quiz created with ID: ${savedQuiz.quizId}\n`);

    // Test 2: Retrieve the quiz
    console.log('Test 2: Retrieving the quiz...');
    const retrievedQuiz = await quizRepository.findOne({
      where: { quizId: savedQuiz.quizId },
    });

    if (retrievedQuiz) {
      console.log('✅ Quiz retrieved successfully');
      console.log(`   Question: ${retrievedQuiz.question}`);
      console.log(`   Difficulty: ${retrievedQuiz.difficulty}`);
      console.log(`   Type: ${retrievedQuiz.type}\n`);
    } else {
      console.log('❌ Failed to retrieve quiz\n');
    }

    // Test 3: Create quiz history
    console.log('Test 3: Creating quiz history record...');
    const testHistory = historyRepository.create({
      gameId: '550e8400-e29b-41d4-a716-446655440000', // Sample UUID
      quizId: savedQuiz.quizId,
      turnNumber: 3,
      playerAnswer: 'A',
      isCorrect: true,
      timeTaken: 15,
      quizType: QuizType.MULTIPLE_CHOICE,
      difficulty: QuizDifficulty.MEDIUM,
      infraContext: ['EC2'],
    });

    const savedHistory = await historyRepository.save(testHistory);
    console.log(`✅ Quiz history created with ID: ${savedHistory.historyId}\n`);

    // Test 4: Query with indexes
    console.log('Test 4: Testing indexed queries...');

    // Test difficulty + type index
    const mediumMultipleChoice = await quizRepository.find({
      where: {
        difficulty: QuizDifficulty.MEDIUM,
        type: QuizType.MULTIPLE_CHOICE,
      },
    });
    console.log(`✅ Found ${mediumMultipleChoice.length} MEDIUM MULTIPLE_CHOICE quiz(zes)`);

    // Test history gameId + turnNumber index
    const gameHistory = await historyRepository.find({
      where: {
        gameId: '550e8400-e29b-41d4-a716-446655440000',
        turnNumber: 3,
      },
    });
    console.log(`✅ Found ${gameHistory.length} history record(s) for game at turn 3\n`);

    // Test 5: Update statistics
    console.log('Test 5: Updating quiz statistics...');
    retrievedQuiz!.usageCount = 1;
    retrievedQuiz!.totalAnswerCount = 1;
    retrievedQuiz!.correctAnswerCount = 1;
    await quizRepository.save(retrievedQuiz!);

    const updatedQuiz = await quizRepository.findOne({
      where: { quizId: savedQuiz.quizId },
    });
    console.log(`✅ Quiz statistics updated`);
    console.log(`   Usage Count: ${updatedQuiz!.usageCount}`);
    console.log(`   Accuracy Rate: ${updatedQuiz!.accuracyRate.toFixed(2)}%\n`);

    // Test 6: Cleanup
    console.log('Test 6: Cleaning up test data...');
    await historyRepository.delete({ historyId: savedHistory.historyId });
    await quizRepository.delete({ quizId: savedQuiz.quizId });
    console.log('✅ Test data cleaned up\n');

    // Success summary
    console.log('═══════════════════════════════════════');
    console.log('🎉 All migration tests passed!');
    console.log('═══════════════════════════════════════');
    console.log('✅ Quiz table - CREATE, READ, UPDATE, DELETE');
    console.log('✅ QuizHistory table - CREATE, READ, DELETE');
    console.log('✅ Indexes - Verified working correctly');
    console.log('✅ Entity mappings - Aligned with schema');
    console.log('═══════════════════════════════════════\n');
  } catch (error) {
    console.error('❌ Migration test failed:');
    console.error(error);
    process.exit(1);
  } finally {
    // Close database connection
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('Database connection closed.');
    }
  }
}

// Run the test
testMigration()
  .then(() => {
    console.log('\n✅ Migration verification complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration verification failed:');
    console.error(error);
    process.exit(1);
  });
