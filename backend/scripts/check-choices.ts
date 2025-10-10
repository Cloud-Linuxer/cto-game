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

const checkChoices = async () => {
  await dataSource.initialize();

  // 특정 카테고리별 선택지 확인
  const specialChoices = await dataSource
    .createQueryBuilder()
    .select('choice')
    .from(Choice, 'choice')
    .where('choice.choiceId IN (:...ids)', {
      ids: [14, 136, 9991, 61, 154] // 채용, IPO, DR 관련
    })
    .getMany();

  console.log('\n=== 특수 선택지 확인 ===');
  specialChoices.forEach(choice => {
    console.log(`\nChoice ID: ${choice.choiceId}`);
    console.log(`Turn: ${choice.turnNumber}`);
    console.log(`Text: ${choice.text.substring(0, 100)}...`);
    console.log(`Category: ${choice.category}`);
  });

  // 일반 선택지 샘플 확인 (기본 템플릿 텍스트 사용하는 것들)
  const genericChoices = await dataSource
    .createQueryBuilder()
    .select('choice')
    .from(Choice, 'choice')
    .where(`choice.text LIKE '%새로운 기회를 창출합니다%'`)
    .limit(5)
    .getMany();

  console.log('\n=== 기본 템플릿 텍스트를 사용하는 선택지들 (샘플) ===');
  genericChoices.forEach(choice => {
    console.log(`\nChoice ID: ${choice.choiceId}`);
    console.log(`Turn: ${choice.turnNumber}`);
    console.log(`Text: ${choice.text.substring(0, 100)}...`);
    console.log(`Category: ${choice.category}`);
  });

  // 전체 통계
  const totalChoices = await dataSource
    .createQueryBuilder()
    .select('COUNT(*)', 'total')
    .from(Choice, 'choice')
    .getRawOne();

  const genericCount = await dataSource
    .createQueryBuilder()
    .select('COUNT(*)', 'count')
    .from(Choice, 'choice')
    .where(`choice.text LIKE '%새로운 기회를 창출합니다%'`)
    .getRawOne();

  const customCount = await dataSource
    .createQueryBuilder()
    .select('COUNT(*)', 'count')
    .from(Choice, 'choice')
    .where(`choice.text NOT LIKE '%새로운 기회를 창출합니다%'`)
    .getRawOne();

  console.log('\n=== 선택지 통계 ===');
  console.log(`전체 선택지: ${totalChoices.total}개`);
  console.log(`기본 템플릿 텍스트 사용: ${genericCount.count}개`);
  console.log(`커스텀 텍스트 사용: ${customCount.count}개`);

  await dataSource.destroy();
};

checkChoices()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error checking choices:', error);
    process.exit(1);
  });