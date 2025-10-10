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

const fixTurn1Text = async () => {
  await dataSource.initialize();

  console.log('\n=== Turn 1 텍스트 수정 시작 ===\n');

  // Choice 1: 친구/지인 대상 소규모 마케팅 - -10만원 → -8만원
  const choice1 = await dataSource
    .getRepository(Choice)
    .findOne({ where: { choiceId: 1 } });

  if (choice1) {
    const oldText = choice1.text;
    // 비용 라인에 있는 -10만 원을 -8만 원으로 수정
    const newText = choice1.text.replace('💰 비용: -10만 원', '💰 비용: -8만 원');

    await dataSource
      .getRepository(Choice)
      .update({ choiceId: 1 }, { text: newText });

    console.log('[Choice 1] 친구/지인 대상 소규모 마케팅');
    console.log('이전: -10만 원');
    console.log('수정: -8만 원');
    console.log('DB 실제 값: ' + choice1.effects.cash + '원\n');
  }

  // Choice 3: 보안/신뢰성 확보 - -1만원/월 → -8천원/월
  const choice3 = await dataSource
    .getRepository(Choice)
    .findOne({ where: { choiceId: 3 } });

  if (choice3) {
    const oldText = choice3.text;
    // 비용 라인에 있는 -1만 원/월을 -8천 원/월로 수정
    const newText = choice3.text.replace('💰 비용: -1만 원/월', '💰 비용: -8천 원/월');

    await dataSource
      .getRepository(Choice)
      .update({ choiceId: 3 }, { text: newText });

    console.log('[Choice 3] 보안/신뢰성 확보 — 도메인 + HTTPS 연결');
    console.log('이전: -1만 원/월');
    console.log('수정: -8천 원/월');
    console.log('DB 실제 값: ' + choice3.effects.cash + '원\n');
  }

  // 수정 후 확인
  const turn1Choices = await dataSource
    .createQueryBuilder()
    .select('choice')
    .from(Choice, 'choice')
    .where('choice.turnNumber = :turn', { turn: 1 })
    .orderBy('choice.choiceId')
    .getMany();

  console.log('\n=== 수정 후 Turn 1 선택지 확인 ===\n');
  turn1Choices.forEach(choice => {
    const firstLine = choice.text.split('\n')[0];
    const textCost = choice.text.match(/💰[^:]+: ([^\n]+)/)?.[1] || '텍스트에 없음';

    console.log(`[Choice ${choice.choiceId}] ${firstLine}`);
    console.log('📝 텍스트 표시: ' + textCost);
    console.log('💾 DB 실제 값: cash=' + choice.effects.cash + ', trust=' + choice.effects.trust + ', users=' + choice.effects.users);
    console.log('---\n');
  });

  await dataSource.destroy();
};

fixTurn1Text()
  .then(() => {
    console.log('✅ Turn 1 텍스트 수정 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fixing turn 1 text:', error);
    process.exit(1);
  });