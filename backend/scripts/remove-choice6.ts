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

const removeChoice6 = async () => {
  await dataSource.initialize();

  console.log('\n=== Choice 6 제거 작업 시작 ===\n');

  // 먼저 Choice 6의 정보 확인
  const choice6 = await dataSource
    .getRepository(Choice)
    .findOne({ where: { choiceId: 6 } });

  if (choice6) {
    const firstLine = choice6.text.split('\n')[0];
    console.log('삭제할 선택지:');
    console.log(`[Choice ${choice6.choiceId}] ${firstLine}`);
    console.log(`Turn: ${choice6.turnNumber}`);
    console.log(`Effects: cash=${choice6.effects.cash}, trust=${choice6.effects.trust}, users=${choice6.effects.users}\n`);

    // Choice 6 삭제
    await dataSource
      .getRepository(Choice)
      .delete({ choiceId: 6 });

    console.log('✅ Choice 6 삭제 완료\n');
  } else {
    console.log('⚠️ Choice 6을 찾을 수 없습니다.\n');
  }

  // 삭제 후 Turn 2 선택지 목록 확인
  const turn2Choices = await dataSource
    .createQueryBuilder()
    .select('choice')
    .from(Choice, 'choice')
    .where('choice.turnNumber = :turn', { turn: 2 })
    .orderBy('choice.choiceId')
    .getMany();

  console.log('=== 삭제 후 Turn 2 선택지 목록 ===\n');
  turn2Choices.forEach(choice => {
    const firstLine = choice.text.split('\n')[0];
    console.log(`[Choice ${choice.choiceId}] ${firstLine}`);
  });
  console.log(`\n총 ${turn2Choices.length}개의 선택지가 남아있습니다.`);

  await dataSource.destroy();
};

removeChoice6()
  .then(() => {
    console.log('\n✅ 작업 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error removing choice 6:', error);
    process.exit(1);
  });