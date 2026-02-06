import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Repository } from 'typeorm';
import { Quiz, QuizSource, QuizDifficulty } from '../src/database/entities/quiz.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';

async function clearAndReseedQuizzes() {
  console.log('=== 퀴즈 데이터 초기화 및 재적용 ===\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const quizRepository = app.get<Repository<Quiz>>(getRepositoryToken(Quiz));

  // 1. 기존 FALLBACK 퀴즈 모두 삭제
  console.log('1️⃣ 기존 FALLBACK 퀴즈 삭제 중...');
  const deleteResult = await quizRepository.delete({ source: QuizSource.FALLBACK });
  console.log(`   ✅ ${deleteResult.affected || 0}개 퀴즈 삭제 완료\n`);

  // 2. 수정된 퀴즈 파일 로드
  const filePath = path.join(__dirname, '../data/fallback-quizzes.json');
  if (!fs.existsSync(filePath)) {
    console.error(`❌ 파일을 찾을 수 없습니다: ${filePath}`);
    await app.close();
    process.exit(1);
  }

  const quizData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`2️⃣ ${quizData.length}개 퀴즈 로드`);
  console.log('─'.repeat(60));

  // 샘플 퀴즈 확인 (선택지에 A), B) 등이 없는지 확인)
  console.log('\n샘플 퀴즈 확인:');
  console.log(`질문: ${quizData[0].question.substring(0, 50)}...`);
  console.log(`선택지: ${JSON.stringify(quizData[0].options.slice(0, 2))}`);
  if (quizData[0].options[0].match(/^[A-D]\)/)) {
    console.warn('⚠️  경고: 선택지에 "A)", "B)" 접두어가 여전히 존재합니다!');
  } else {
    console.log('✅ 선택지 형식 정상');
  }
  console.log('─'.repeat(60));

  // 3. 퀴즈 저장
  console.log('\n3️⃣ 퀴즈 저장 중...');
  let imported = 0;
  let errors = 0;

  for (const data of quizData) {
    try {
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

      if (imported % 20 === 0) {
        const percentage = ((imported / quizData.length) * 100).toFixed(1);
        console.log(`   진행: ${imported}/${quizData.length} (${percentage}%)`);
      }
    } catch (error) {
      errors++;
      console.error(`   ❌ 실패: "${data.question.substring(0, 30)}..." - ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ ${imported}/${quizData.length}개 퀴즈 저장 완료`);
  if (errors > 0) {
    console.log(`❌ 에러: ${errors}건`);
  }
  console.log('='.repeat(60));

  // 4. 데이터베이스 상태 확인
  console.log('\n4️⃣ 데이터베이스 상태 확인');
  console.log('─'.repeat(60));

  const totalQuizzes = await quizRepository.count();
  const fallbackQuizzes = await quizRepository.count({ where: { source: QuizSource.FALLBACK } });
  const easyQuizzes = await quizRepository.count({
    where: { source: QuizSource.FALLBACK, difficulty: QuizDifficulty.EASY }
  });
  const mediumQuizzes = await quizRepository.count({
    where: { source: QuizSource.FALLBACK, difficulty: QuizDifficulty.MEDIUM }
  });
  const hardQuizzes = await quizRepository.count({
    where: { source: QuizSource.FALLBACK, difficulty: QuizDifficulty.HARD }
  });

  console.log(`총 퀴즈 수:          ${totalQuizzes}`);
  console.log(`FALLBACK 퀴즈:      ${fallbackQuizzes}`);
  console.log(`  - EASY:           ${easyQuizzes}`);
  console.log(`  - MEDIUM:         ${mediumQuizzes}`);
  console.log(`  - HARD:           ${hardQuizzes}`);
  console.log('='.repeat(60));

  await app.close();
}

clearAndReseedQuizzes()
  .then(() => {
    console.log('\n✅ 퀴즈 데이터 초기화 및 재적용 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 실패:', error);
    process.exit(1);
  });
