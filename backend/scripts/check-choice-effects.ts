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

const checkChoiceEffects = async () => {
  await dataSource.initialize();

  // Turn 1 선택지들의 실제 effects 확인
  const turn1Choices = await dataSource
    .createQueryBuilder()
    .select('choice')
    .from(Choice, 'choice')
    .where('choice.turnNumber = :turn', { turn: 1 })
    .orderBy('choice.choiceId')
    .getMany();

  console.log('\n=== Turn 1 선택지 - 텍스트 vs 실제 Effects ===\n');

  turn1Choices.forEach(choice => {
    const firstLine = choice.text.split('\n')[0];
    const textCost = choice.text.match(/💰[^:]+: ([^\n]+)/)?.[1] || '텍스트에 없음';

    console.log(`[Choice ${choice.choiceId}] ${firstLine}`);
    console.log('📝 텍스트에 표시된 비용:', textCost);
    console.log('💾 실제 DB Effects:');
    console.log(`   - cash: ${choice.effects.cash}`);
    console.log(`   - trust: ${choice.effects.trust}`);
    console.log(`   - users: ${choice.effects.users}`);
    console.log(`   - infra: ${JSON.stringify(choice.effects.infra)}`);
    console.log('---\n');
  });

  await dataSource.destroy();
};

checkChoiceEffects()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error checking choice effects:', error);
    process.exit(1);
  });