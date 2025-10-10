import { DataSource } from 'typeorm';
import { Choice } from '../src/database/entities/choice.entity';

const dataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'cto_admin',
  password: 'cto_game_password',
  database: 'cto_game',
  entities: [Choice],
  synchronize: false,
});

const cleanNoCostTitles = async () => {
  await dataSource.initialize();

  console.log('\n=== "(비용 없음)" 제거 작업 시작 ===\n');

  // 모든 선택지 가져오기
  const allChoices = await dataSource
    .getRepository(Choice)
    .find({ order: { choiceId: 'ASC' } });

  let updatedCount = 0;

  for (const choice of allChoices) {
    const lines = choice.text.split('\n');
    const firstLine = lines[0];

    // 제목에 "(비용 없음)"이 있는지 확인
    if (firstLine.includes('(비용 없음)')) {
      const oldTitle = firstLine;
      // "(비용 없음)" 제거
      const newTitle = firstLine.replace(/\s*\(비용 없음\)\s*/, '');

      // 텍스트 업데이트
      lines[0] = newTitle;
      const newText = lines.join('\n');

      await dataSource
        .getRepository(Choice)
        .update({ choiceId: choice.choiceId }, { text: newText });

      console.log(`[Choice ${choice.choiceId}] Turn ${choice.turnNumber}`);
      console.log(`  이전: ${oldTitle}`);
      console.log(`  수정: ${newTitle}`);
      console.log('');

      updatedCount++;
    }
  }

  console.log(`\n=== 수정 결과 ===`);
  console.log(`총 ${updatedCount}개의 선택지에서 "(비용 없음)"을 제거했습니다.\n`);

  // 수정 후 Turn 1-2 선택지 확인
  const sampleChoices = await dataSource
    .createQueryBuilder()
    .select('choice')
    .from(Choice, 'choice')
    .where('choice.turnNumber IN (:...turns)', { turns: [1, 2] })
    .orderBy('choice.turnNumber')
    .addOrderBy('choice.choiceId')
    .getMany();

  console.log('=== Turn 1-2 선택지 제목 최종 확인 ===\n');
  sampleChoices.forEach(choice => {
    const firstLine = choice.text.split('\n')[0];
    console.log(`[Turn ${choice.turnNumber}] Choice ${choice.choiceId}: ${firstLine}`);
  });

  await dataSource.destroy();
};

cleanNoCostTitles()
  .then(() => {
    console.log('\n✅ "(비용 없음)" 제거 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error cleaning no cost titles:', error);
    process.exit(1);
  });