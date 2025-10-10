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

const checkTurn1 = async () => {
  await dataSource.initialize();

  const turn1Choices = await dataSource
    .createQueryBuilder()
    .select('choice')
    .from(Choice, 'choice')
    .where('choice.turnNumber = :turn', { turn: 1 })
    .orderBy('choice.choiceId')
    .getMany();

  console.log('\n=== Turn 1 선택지 확인 ===\n');
  turn1Choices.forEach(choice => {
    console.log(`[Choice ${choice.choiceId}]`);
    console.log(choice.text);
    console.log('---\n');
  });

  // ACM 관련 선택지 찾기
  const acmChoice = turn1Choices.find(c =>
    c.text.toLowerCase().includes('acm') ||
    c.text.includes('ACM') ||
    c.text.includes('Amazon Compute')
  );

  if (acmChoice) {
    console.log('\n=== ACM 관련 선택지 상세 ===');
    console.log(acmChoice.text);
  }

  await dataSource.destroy();
};

checkTurn1()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error checking turn 1:', error);
    process.exit(1);
  });