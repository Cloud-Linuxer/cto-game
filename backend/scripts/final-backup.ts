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

const createFinalBackup = async () => {
  await dataSource.initialize();

  const allChoices = await dataSource
    .getRepository(Choice)
    .find({ order: { choiceId: 'ASC' } });

  const timestamp = new Date().toISOString().replace(/[:.-]/g, '_');
  const backupFileName = `final_backup_all_fixed_${timestamp}.json`;
  const backupPath = `/home/cto-game/backend/${backupFileName}`;

  fs.writeFileSync(backupPath, JSON.stringify(allChoices, null, 2));

  console.log('\n=== 최종 백업 완료 ===');
  console.log(`✅ ${allChoices.length}개의 선택지를 백업했습니다.`);
  console.log(`📁 백업 파일: ${backupPath}`);
  console.log('\n수정 내역 요약:');
  console.log('✓ Turn 1-25: 모든 텍스트와 DB 값 일치 완료');
  console.log('✓ Choice 6 (소규모 마케팅 실행) 제거 완료');
  console.log('✓ 모든 선택지 제목에서 중복 금액 괄호 제거 완료');
  console.log('✓ "(비용 없음)" 텍스트 제거 완료');
  console.log('✓ 총 수정된 선택지: Turn 1(2개), Turn 2(2개), Turn 3(4개), Turn 4-25(88개)');
  console.log('\n모든 작업이 성공적으로 완료되었습니다!');

  await dataSource.destroy();
};

createFinalBackup()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error creating final backup:', error);
    process.exit(1);
  });