const { execSync } = require('child_process');
const { DataSource } = require('typeorm');
const databaseConfig = require('./dist/database/database.config').default;

async function clearQuizzes() {
  console.log('=== 퀴즈 데이터 초기화 ===\n');
  
  const dataSource = new DataSource(databaseConfig);
  await dataSource.initialize();
  console.log('✅ 데이터베이스 연결');

  // 기존 FALLBACK 퀴즈 모두 삭제
  const result = await dataSource.query("DELETE FROM quizzes WHERE source = 'FALLBACK'");
  console.log(`✅ 기존 퀴즈 삭제 완료`);

  // 현재 남은 퀴즈 수 확인
  const [{ count }] = await dataSource.query('SELECT COUNT(*) as count FROM quizzes');
  console.log(`📊 남은 퀴즈 수: ${count}개\n`);

  await dataSource.destroy();
}

clearQuizzes()
  .then(() => {
    console.log('✅ 완료');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ 에러:', err);
    process.exit(1);
  });
