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

const checkTurn25 = async () => {
  await dataSource.initialize();

  const turn25Choices = await dataSource
    .createQueryBuilder()
    .select('choice')
    .from(Choice, 'choice')
    .where('choice.turnNumber = :turn', { turn: 25 })
    .orderBy('choice.choiceId')
    .getMany();

  console.log('\n=== Turn 25 선택지 확인 ===');
  turn25Choices.forEach(choice => {
    const firstLine = choice.text.split('\n')[0];
    console.log(`Choice ${choice.choiceId}: ${firstLine} => nextTurn: ${choice.nextTurn}`);
  });

  await dataSource.destroy();
};

checkTurn25()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error checking turn 25:', error);
    process.exit(1);
  });
