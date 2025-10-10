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

const restoreFromBackup = async () => {
  await dataSource.initialize();

  // 백업 파일 읽기 - 업데이트 전 원본
  const backupFile = 'backup/choices_backup_2025-10-02T07-09-42-427Z.json';
  const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));

  let restoredCount = 0;
  let improvedCount = 0;

  for (const choice of backupData) {
    const choiceId = choice.choiceId;
    const originalText = choice.text;

    // 개선할 텍스트 결정
    let improvedText = originalText;

    // "새로운 기회를 창출합니다" 기본 템플릿만 개선
    if (originalText.includes('새로운 기회를 창출합니다')) {
      const firstLine = originalText.split('\n')[0];

      // 카테고리별 개선
      if (firstLine.includes('마케팅') || firstLine.includes('광고') || firstLine.includes('캠페인')) {
        improvedText = firstLine + '\n\n브랜드 인지도를 효과적으로 높입니다.\n타겟 고객에게 정확히 도달합니다.\n마케팅 ROI를 극대화합니다.';
      } else if (firstLine.includes('EC2') || firstLine.includes('RDS') || firstLine.includes('AWS') || firstLine.includes('인프라')) {
        improvedText = firstLine + '\n\n서비스 안정성이 크게 향상됩니다.\n확장 가능한 인프라를 구축합니다.\n기술적 경쟁력을 확보합니다.';
      } else if (firstLine.includes('기능') || firstLine.includes('개발') || firstLine.includes('UI')) {
        improvedText = firstLine + '\n\n사용자 경험이 획기적으로 개선됩니다.\n제품 완성도가 높아집니다.\n경쟁사와 차별화됩니다.';
      } else if (firstLine.includes('투자') || firstLine.includes('시리즈')) {
        improvedText = firstLine + '\n\n성장을 위한 자금을 확보합니다.\n투자자 네트워크를 활용할 수 있습니다.\n기업 가치가 상승합니다.';
      } else if (firstLine.includes('채용') || firstLine.includes('영입')) {
        improvedText = firstLine + '\n\n팀 역량이 크게 강화됩니다.\n전문성을 확보합니다.\n조직 문화를 발전시킵니다.';
      } else if (firstLine.includes('수익') || firstLine.includes('매출') || firstLine.includes('비즈니스')) {
        improvedText = firstLine + '\n\n안정적인 수익 모델을 구축합니다.\n재무 건전성을 확보합니다.\n지속가능한 성장이 가능해집니다.';
      } else if (firstLine.includes('글로벌') || firstLine.includes('해외')) {
        improvedText = firstLine + '\n\n새로운 시장의 문이 열립니다.\n글로벌 경쟁력을 갖춥니다.\n무한한 성장 가능성을 확보합니다.';
      } else {
        improvedText = firstLine + '\n\n전략적 선택으로 미래를 준비합니다.\n지속가능한 성장을 추구합니다.\n새로운 기회를 창출합니다.';
      }
      improvedCount++;
    }

    // DB 업데이트
    await dataSource
      .createQueryBuilder()
      .update(Choice)
      .set({ text: improvedText })
      .where('choiceId = :choiceId', { choiceId })
      .execute();

    restoredCount++;
  }

  console.log('\n=== 복원 완료 ===');
  console.log(`✅ 총 ${restoredCount}개 선택지 처리`);
  console.log(`📝 ${improvedCount}개 기본 템플릿 개선`);
  console.log(`🔄 ${restoredCount - improvedCount}개 원본 유지`);

  await dataSource.destroy();
};

restoreFromBackup()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error restoring from backup:', error);
    process.exit(1);
  });