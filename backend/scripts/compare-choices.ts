import { DataSource } from 'typeorm';
import { Choice } from '../src/database/entities/choice.entity';
import * as fs from 'fs';

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

const compareChoices = async () => {
  await dataSource.initialize();

  // 백업본 읽기
  const backupData = JSON.parse(
    fs.readFileSync('backup/choices_backup_2025-10-02T07-49-59-209Z.json', 'utf-8')
  );

  // 몇 개 샘플 비교
  const sampleIds = [1, 14, 11, 12, 13, 9001, 9002];

  console.log('\n=== 선택지 텍스트 비교 (백업본 vs 현재) ===\n');

  for (const id of sampleIds) {
    const backupChoice = backupData.find((c: any) => c.choiceId === id);
    const currentChoice = await dataSource
      .createQueryBuilder()
      .select('choice')
      .from(Choice, 'choice')
      .where('choice.choiceId = :id', { id })
      .getOne();

    console.log(`Choice ID ${id}:`);
    console.log('백업본 첫줄:', backupChoice?.text?.split('\n')[0] || 'Not found');
    console.log('현재 첫줄:', currentChoice?.text?.split('\n')[0] || 'Not found');

    // 내용이 같은지 다른지 체크
    if (backupChoice && currentChoice) {
      const backupLines = backupChoice.text.split('\n').slice(1, 4);
      const currentLines = currentChoice.text.split('\n').slice(1, 4);

      if (JSON.stringify(backupLines) === JSON.stringify(currentLines)) {
        console.log('➡️ 내용 동일');
      } else {
        console.log('➡️ 내용 변경됨');
        console.log('  백업본 내용:', backupLines.join(' / '));
        console.log('  현재 내용:', currentLines.join(' / '));
      }
    }
    console.log('---');
  }

  await dataSource.destroy();
};

compareChoices()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error comparing choices:', error);
    process.exit(1);
  });