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

const cleanChoiceTitles = async () => {
  await dataSource.initialize();

  console.log('\n=== 선택지 제목 정리 시작 ===\n');

  // 모든 선택지 가져오기
  const allChoices = await dataSource
    .getRepository(Choice)
    .find({ order: { choiceId: 'ASC' } });

  let updatedCount = 0;

  for (const choice of allChoices) {
    const lines = choice.text.split('\n');
    const firstLine = lines[0];

    // 제목에 괄호가 있는지 확인 (금액 패턴)
    const pricePattern = /\s*\([^)]*[만천백십]?\s*원[^)]*\)\s*$/;

    if (pricePattern.test(firstLine)) {
      const oldTitle = firstLine;
      // 괄호와 그 안의 내용 제거
      const newTitle = firstLine.replace(pricePattern, '');

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
  console.log(`총 ${updatedCount}개의 선택지 제목을 정리했습니다.\n`);

  // 수정 후 샘플 확인 (Turn 1, 2의 선택지들)
  const sampleChoices = await dataSource
    .createQueryBuilder()
    .select('choice')
    .from(Choice, 'choice')
    .where('choice.turnNumber IN (:...turns)', { turns: [1, 2] })
    .orderBy('choice.turnNumber')
    .addOrderBy('choice.choiceId')
    .getMany();

  console.log('=== Turn 1-2 선택지 제목 확인 ===\n');
  sampleChoices.forEach(choice => {
    const firstLine = choice.text.split('\n')[0];
    console.log(`[Turn ${choice.turnNumber}] Choice ${choice.choiceId}: ${firstLine}`);
  });

  await dataSource.destroy();
};

cleanChoiceTitles()
  .then(() => {
    console.log('\n✅ 제목 정리 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error cleaning titles:', error);
    process.exit(1);
  });