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

const checkTurn8 = async () => {
  await dataSource.initialize();

  const turn8Choices = await dataSource
    .createQueryBuilder()
    .select('choice')
    .from(Choice, 'choice')
    .where('choice.turnNumber = :turn', { turn: 8 })
    .orderBy('choice.choiceId')
    .getMany();

  console.log('\n=== Turn 8 선택지 목록 ===\n');
  turn8Choices.forEach(choice => {
    console.log(`[Choice ${choice.choiceId}]`);
    console.log(choice.text);
    console.log('---\n');
  });

  console.log(`총 ${turn8Choices.length}개의 선택지`);

  await dataSource.destroy();
};

checkTurn8()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error checking turn 8:', error);
    process.exit(1);
  });