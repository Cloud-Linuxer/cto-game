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

const fixTurn3Text = async () => {
  await dataSource.initialize();

  console.log('\n=== Turn 3 텍스트 수정 시작 ===\n');

  // Choice 11: 추가 마케팅 캠페인 - -20만원 → -16만원
  const choice11 = await dataSource
    .getRepository(Choice)
    .findOne({ where: { choiceId: 11 } });

  if (choice11) {
    const newText = choice11.text.replace('💰 비용: -20만 원', '💰 비용: -16만 원');

    await dataSource
      .getRepository(Choice)
      .update({ choiceId: 11 }, { text: newText });

    console.log('[Choice 11] 추가 마케팅 캠페인');
    console.log('이전: -20만 원');
    console.log('수정: -16만 원');
    console.log('DB 실제 값: ' + choice11.effects.cash + '원\n');
  }

  // Choice 12: Aurora RDS 전환 - -30만원/월 → -24만원/월
  const choice12 = await dataSource
    .getRepository(Choice)
    .findOne({ where: { choiceId: 12 } });

  if (choice12) {
    const newText = choice12.text.replace('💰 비용: -30만 원/월', '💰 비용: -24만 원/월');

    await dataSource
      .getRepository(Choice)
      .update({ choiceId: 12 }, { text: newText });

    console.log('[Choice 12] Aurora RDS 전환');
    console.log('이전: -30만 원/월');
    console.log('수정: -24만 원/월');
    console.log('DB 실제 값: ' + choice12.effects.cash + '원\n');
  }

  // Choice 13: EC2 스케일업 - -10만원/월 → -8만원/월
  const choice13 = await dataSource
    .getRepository(Choice)
    .findOne({ where: { choiceId: 13 } });

  if (choice13) {
    const newText = choice13.text.replace('💰 비용: -10만 원/월', '💰 비용: -8만 원/월');

    await dataSource
      .getRepository(Choice)
      .update({ choiceId: 13 }, { text: newText });

    console.log('[Choice 13] EC2 스케일업 — t4g.medium으로 업그레이드');
    console.log('이전: -10만 원/월');
    console.log('수정: -8만 원/월');
    console.log('DB 실제 값: ' + choice13.effects.cash + '원\n');
  }

  // Choice 14: 개발자 1명 채용 - -300만원/월 → -240만원/월
  const choice14 = await dataSource
    .getRepository(Choice)
    .findOne({ where: { choiceId: 14 } });

  if (choice14) {
    const newText = choice14.text.replace('💰 비용: -300만 원/월', '💰 비용: -240만 원/월');

    await dataSource
      .getRepository(Choice)
      .update({ choiceId: 14 }, { text: newText });

    console.log('[Choice 14] 개발자 1명 채용');
    console.log('이전: -300만 원/월');
    console.log('수정: -240만 원/월');
    console.log('DB 실제 값: ' + choice14.effects.cash + '원\n');
  }

  // 수정 후 확인
  const turn3Choices = await dataSource
    .createQueryBuilder()
    .select('choice')
    .from(Choice, 'choice')
    .where('choice.turnNumber = :turn', { turn: 3 })
    .orderBy('choice.choiceId')
    .getMany();

  console.log('\n=== 수정 후 Turn 3 선택지 확인 ===\n');
  turn3Choices.forEach(choice => {
    const firstLine = choice.text.split('\n')[0];
    const textCost = choice.text.match(/💰[^:]+: ([^\n]+)/)?.[1] || '텍스트에 없음';

    console.log(`[Choice ${choice.choiceId}] ${firstLine}`);
    console.log('📝 텍스트 표시: ' + textCost);
    console.log('💾 DB 실제 값: cash=' + choice.effects.cash + ', trust=' + choice.effects.trust + ', users=' + choice.effects.users);
    console.log('---\n');
  });

  await dataSource.destroy();
};

fixTurn3Text()
  .then(() => {
    console.log('✅ Turn 3 텍스트 수정 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fixing turn 3 text:', error);
    process.exit(1);
  });