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

const fixTurn6WAF = async () => {
  await dataSource.initialize();

  console.log('\n=== Turn 6 보안 인증 강화 WAF 추가 시작 ===\n');

  // Choice 55: 보안 인증 강화
  const choice55 = await dataSource
    .getRepository(Choice)
    .findOne({ where: { choiceId: 55 } });

  if (choice55) {
    const oldInfra = [...choice55.effects.infra];
    const oldText = choice55.text;

    // WAF를 인프라에 추가
    if (!choice55.effects.infra.includes('WAF')) {
      choice55.effects.infra.push('WAF');
    }

    // 텍스트에 인프라 정보 추가 (없는 경우)
    let newText = oldText;
    const lines = oldText.split('\n');

    // 인프라 정보가 없으면 추가
    if (!oldText.includes('🏗️')) {
      // 비용 다음 줄에 인프라 정보 추가
      const costLineIndex = lines.findIndex(line => line.includes('💰'));
      if (costLineIndex !== -1) {
        lines.splice(costLineIndex + 1, 0, '🏗️ 인프라: S3, Redis, WAF');
      }
      newText = lines.join('\n');
    } else {
      // 기존 인프라 정보 업데이트
      newText = oldText.replace(/🏗️[^\n]+/, '🏗️ 인프라: S3, Redis, WAF');
    }

    await dataSource
      .getRepository(Choice)
      .update({ choiceId: 55 }, {
        effects: choice55.effects,
        text: newText
      });

    console.log('[Choice 55] 보안 인증 강화 — ISO 27001 준비 + WAF 구성');
    console.log(`이전 인프라: ${JSON.stringify(oldInfra)}`);
    console.log(`수정 인프라: ${JSON.stringify(choice55.effects.infra)}`);
    console.log(`인프라 텍스트 추가: 🏗️ 인프라: S3, Redis, WAF\n`);
  }

  // 수정 후 확인
  const updatedChoice = await dataSource
    .getRepository(Choice)
    .findOne({ where: { choiceId: 55 } });

  if (updatedChoice) {
    console.log('=== 수정 완료 확인 ===');
    console.log(`DB infra 값: ${JSON.stringify(updatedChoice.effects.infra)}`);
    const infraLine = updatedChoice.text.split('\n').find(line => line.includes('🏗️'));
    console.log(`텍스트 표시: ${infraLine || '인프라 정보 없음'}`);
  }

  await dataSource.destroy();
};

fixTurn6WAF()
  .then(() => {
    console.log('\n✅ Turn 6 보안 인증 강화 WAF 추가 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fixing turn 6 WAF:', error);
    process.exit(1);
  });