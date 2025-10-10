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

const fixTurn2Text = async () => {
  await dataSource.initialize();

  console.log('\n=== Turn 2 텍스트 수정 시작 ===\n');

  // Choice 6: 소규모 마케팅 실행 - -10만원 → -8만원
  const choice6 = await dataSource
    .getRepository(Choice)
    .findOne({ where: { choiceId: 6 } });

  if (choice6) {
    // 비용 라인에 있는 -10만 원을 -8만 원으로 수정
    const newText = choice6.text.replace('💰 비용: -10만 원', '💰 비용: -8만 원');

    await dataSource
      .getRepository(Choice)
      .update({ choiceId: 6 }, { text: newText });

    console.log('[Choice 6] 소규모 마케팅 실행');
    console.log('이전: -10만 원');
    console.log('수정: -8만 원');
    console.log('DB 실제 값: ' + choice6.effects.cash + '원\n');
  }

  // Choice 9: CloudWatch 기본 모니터링 구축 - -5만원/월 → -4만원/월
  const choice9 = await dataSource
    .getRepository(Choice)
    .findOne({ where: { choiceId: 9 } });

  if (choice9) {
    // 비용 라인에 있는 -5만 원/월을 -4만 원/월로 수정
    const newText = choice9.text.replace('💰 비용: -5만 원/월', '💰 비용: -4만 원/월');

    await dataSource
      .getRepository(Choice)
      .update({ choiceId: 9 }, { text: newText });

    console.log('[Choice 9] CloudWatch 기본 모니터링 구축');
    console.log('이전: -5만 원/월');
    console.log('수정: -4만 원/월');
    console.log('DB 실제 값: ' + choice9.effects.cash + '원\n');
  }

  // 수정 후 확인
  const turn2Choices = await dataSource
    .createQueryBuilder()
    .select('choice')
    .from(Choice, 'choice')
    .where('choice.turnNumber = :turn', { turn: 2 })
    .orderBy('choice.choiceId')
    .getMany();

  console.log('\n=== 수정 후 Turn 2 선택지 확인 ===\n');
  turn2Choices.forEach(choice => {
    const firstLine = choice.text.split('\n')[0];
    const textCost = choice.text.match(/💰[^:]+: ([^\n]+)/)?.[1] || '텍스트에 없음';

    console.log(`[Choice ${choice.choiceId}] ${firstLine}`);
    console.log('📝 텍스트 표시: ' + textCost);
    console.log('💾 DB 실제 값: cash=' + choice.effects.cash + ', trust=' + choice.effects.trust + ', users=' + choice.effects.users);
    console.log('---\n');
  });

  await dataSource.destroy();
};

fixTurn2Text()
  .then(() => {
    console.log('✅ Turn 2 텍스트 수정 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fixing turn 2 text:', error);
    process.exit(1);
  });