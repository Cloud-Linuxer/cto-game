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

const checkTurn2 = async () => {
  await dataSource.initialize();

  const turn2Choices = await dataSource
    .createQueryBuilder()
    .select('choice')
    .from(Choice, 'choice')
    .where('choice.turnNumber = :turn', { turn: 2 })
    .orderBy('choice.choiceId')
    .getMany();

  console.log('\n=== Turn 2 선택지 확인 ===');
  turn2Choices.forEach(choice => {
    const firstLine = choice.text.split('\n')[0];
    console.log(`Choice ${choice.choiceId}: ${firstLine}`);
  });

  // Choice 8 상세 확인
  const choice8 = turn2Choices.find(c => c.choiceId === 8);
  if (choice8) {
    console.log('\n=== Choice 8 상세 ===');
    console.log(choice8.text);
  }

  await dataSource.destroy();
};

checkTurn2()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error checking turn 2:', error);
    process.exit(1);
  });