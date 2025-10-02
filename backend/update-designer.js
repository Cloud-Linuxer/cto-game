const { DataSource } = require('typeorm');

const dataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'cto_admin',
  password: 'cto_game_password',
  database: 'cto_game',
});

async function updateChoice23() {
  await dataSource.initialize();

  const result = await dataSource.query(`
    UPDATE choices
    SET text = $1, effects = $2
    WHERE "choiceId" = 23
  `, [
    'UX/UI 디자이너 채용 — 제품 경험 강화 (월 350만 원)\n\n📈 예상 효과: UI/UX 개선으로 사용자 만족도 상승, 전환율 20% 향상\n🖥️ 인프라 영향: 디자인 시스템 구축, 프론트엔드 성능 최적화 필요\n💰 비용: -350만 원/월',
    JSON.stringify({ users: 0, cash: -2800000, infra: [], trust: 25 })
  ]);

  console.log('✅ Choice 23 updated successfully!');
  console.log('Updated rows:', result[1]);

  await dataSource.destroy();
}

updateChoice23().catch(console.error);
