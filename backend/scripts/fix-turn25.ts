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

const fixTurn25 = async () => {
  await dataSource.initialize();

  // Turn 25 선택지들의 nextTurn을 26으로 수정
  const result = await dataSource
    .createQueryBuilder()
    .update(Choice)
    .set({ nextTurn: 26 })
    .where('turnNumber = :turn', { turn: 25 })
    .execute();

  console.log(`\n=== Turn 25 선택지 수정 완료 ===`);
  console.log(`수정된 선택지 개수: ${result.affected}개`);
  console.log(`이제 25턴 선택지들이 26턴으로 진행되어 게임이 정상 종료됩니다.`);

  // 수정 후 확인
  const turn25Choices = await dataSource
    .createQueryBuilder()
    .select('choice')
    .from(Choice, 'choice')
    .where('choice.turnNumber = :turn', { turn: 25 })
    .orderBy('choice.choiceId')
    .getMany();

  console.log('\n=== 수정 후 확인 ===');
  turn25Choices.forEach(choice => {
    const firstLine = choice.text.split('\n')[0];
    console.log(`Choice ${choice.choiceId}: nextTurn = ${choice.nextTurn}`);
  });

  await dataSource.destroy();
};

fixTurn25()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error fixing turn 25:', error);
    process.exit(1);
  });