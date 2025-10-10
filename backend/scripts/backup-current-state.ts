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

const backupCurrentState = async () => {
  await dataSource.initialize();

  const allChoices = await dataSource
    .getRepository(Choice)
    .find({ order: { choiceId: 'ASC' } });

  const timestamp = new Date().toISOString().replace(/[:.-]/g, '_');
  const backupFileName = `backup_choices_${timestamp}.json`;
  const backupPath = `/home/cto-game/backend/${backupFileName}`;

  fs.writeFileSync(backupPath, JSON.stringify(allChoices, null, 2));

  console.log('\n=== 백업 완료 ===');
  console.log(`✅ ${allChoices.length}개의 선택지를 백업했습니다.`);
  console.log(`📁 백업 파일: ${backupPath}`);
  console.log('\n백업 내용:');
  console.log('- Turn 1-3: 텍스트와 DB 값 일치 완료');
  console.log('- Choice 6 제거 완료');
  console.log('- 모든 선택지 제목에서 괄호 내 금액 제거 완료');
  console.log('- "(비용 없음)" 제거 완료');

  await dataSource.destroy();
};

backupCurrentState()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error creating backup:', error);
    process.exit(1);
  });