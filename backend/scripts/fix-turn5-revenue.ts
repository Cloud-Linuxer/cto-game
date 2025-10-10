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

const fixTurn5Revenue = async () => {
  await dataSource.initialize();

  console.log('\n=== Turn 5 수익화 모델 수정 시작 ===\n');

  // Choice 25: 수익화 모델 구축
  const choice25 = await dataSource
    .getRepository(Choice)
    .findOne({ where: { choiceId: 25 } });

  if (choice25) {
    const oldCash = choice25.effects.cash;
    const oldText = choice25.text;

    // DB 값 변경: 50만원 → 1000만원
    choice25.effects.cash = 10000000;

    // 텍스트 변경: 50만 원 → +1000만 원 (수익이므로 +표시)
    const newText = oldText.replace('💰 비용: 50만 원', '💰 수익: +1000만 원');

    await dataSource
      .getRepository(Choice)
      .update({ choiceId: 25 }, {
        effects: choice25.effects,
        text: newText
      });

    console.log('[Choice 25] 수익화 모델 구축 — 유료 플랜 출시');
    console.log(`이전 DB 값: ${oldCash}원 (${oldCash/10000}만원)`);
    console.log(`수정 DB 값: 10000000원 (1000만원)`);
    console.log(`이전 텍스트: 💰 비용: 50만 원`);
    console.log(`수정 텍스트: 💰 수익: +1000만 원\n`);
  }

  // 수정 후 확인
  const updatedChoice = await dataSource
    .getRepository(Choice)
    .findOne({ where: { choiceId: 25 } });

  if (updatedChoice) {
    console.log('=== 수정 완료 확인 ===');
    console.log(`DB cash 값: ${updatedChoice.effects.cash}원`);
    const costLine = updatedChoice.text.split('\n').find(line => line.includes('💰'));
    console.log(`텍스트 표시: ${costLine}`);
  }

  await dataSource.destroy();
};

fixTurn5Revenue()
  .then(() => {
    console.log('\n✅ Turn 5 수익화 모델 수정 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fixing turn 5 revenue:', error);
    process.exit(1);
  });