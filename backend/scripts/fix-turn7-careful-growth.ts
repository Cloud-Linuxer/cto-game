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

const fixTurn7CarefulGrowth = async () => {
  await dataSource.initialize();

  console.log('\n=== Turn 7 신중한 성장 수익화 전환 시작 ===\n');

  // Choice 64: 신중한 성장
  const choice64 = await dataSource
    .getRepository(Choice)
    .findOne({ where: { choiceId: 64 } });

  if (choice64) {
    const oldCash = choice64.effects.cash;
    const oldText = choice64.text;

    // 새로운 제목과 내용
    const newTitle = '효율적 운영 — 비용 최적화로 수익성 개선';
    const newText = `${newTitle}

📈 비즈니스 효과: 운영 효율화로 수익 창출, 안정적 캐시플로우 확보
🖥️ 인프라 영향: 클라우드 비용 최적화, Reserved Instance 활용
💰 수익: +5000만 원`;

    // DB 값 변경: -8000만원 → +5000만원
    choice64.effects.cash = 50000000;

    // 사용자 증가도 더 현실적으로 조정
    choice64.effects.users = 20000;

    // 신뢰도는 유지 (이미 4점)

    await dataSource
      .getRepository(Choice)
      .update({ choiceId: 64 }, {
        text: newText,
        effects: choice64.effects
      });

    console.log('[Choice 64] 변경 내용');
    console.log('이전 제목: 신중한 성장 — 핵심 인력만 채용 + 인프라 최적화');
    console.log('새 제목: 효율적 운영 — 비용 최적화로 수익성 개선');
    console.log(`\n이전 효과: cash=${oldCash}원 (-8000만원), users=10000`);
    console.log(`새 효과: cash=50000000원 (+5000만원), users=20000`);
    console.log(`\n이전 텍스트: 💰 비용: -8000만 원`);
    console.log(`새 텍스트: 💰 수익: +5000만 원\n`);
  }

  // 수정 후 확인
  const updatedChoice = await dataSource
    .getRepository(Choice)
    .findOne({ where: { choiceId: 64 } });

  if (updatedChoice) {
    console.log('=== 수정 완료 확인 ===');
    console.log('최종 제목:', updatedChoice.text.split('\n')[0]);
    console.log(`DB 효과: cash=${updatedChoice.effects.cash}원, users=${updatedChoice.effects.users}, trust=${updatedChoice.effects.trust}`);
    const moneyLine = updatedChoice.text.split('\n').find(line => line.includes('💰'));
    console.log(`텍스트 표시: ${moneyLine}`);
  }

  await dataSource.destroy();
};

fixTurn7CarefulGrowth()
  .then(() => {
    console.log('\n✅ Turn 7 신중한 성장 수익화 전환 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fixing turn 7 careful growth:', error);
    process.exit(1);
  });