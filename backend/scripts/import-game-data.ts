import { createConnection, Connection } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Turn } from '../src/database/entities/turn.entity';
import { Choice } from '../src/database/entities/choice.entity';

interface GameDataChoice {
  id: number;
  text: string;
  effects: {
    users: number;
    cash: number;
    trust?: number;
    infra?: string[];
  };
  next_turn: number;
  category?: string;
  description?: string;
}

interface GameDataTurn {
  turn: number;
  event: string;
  description?: string;
  choices: GameDataChoice[];
}

async function importGameData() {
  console.log('📦 게임 데이터 임포트 시작...');

  // TypeORM 연결 생성
  const connection: Connection = await createConnection({
    type: 'sqlite',
    database: 'data/cto-game.db',
    entities: [Turn, Choice],
    synchronize: true,
    logging: false,
  });

  try {
    // JSON 파일 읽기
    const jsonPath = path.join(__dirname, '../../game_choices_db.json');
    const jsonData = fs.readFileSync(jsonPath, 'utf-8');
    const gameData: GameDataTurn[] = JSON.parse(jsonData);

    console.log(`📚 총 ${gameData.length}개 턴 데이터 발견`);

    const turnRepository = connection.getRepository(Turn);
    const choiceRepository = connection.getRepository(Choice);

    // 기존 데이터 삭제
    await choiceRepository.clear();
    await turnRepository.clear();
    console.log('🗑️  기존 데이터 삭제 완료');

    let totalChoices = 0;

    // 트랜잭션으로 데이터 임포트
    await connection.transaction(async (manager) => {
      for (const turnData of gameData) {
        // Turn 엔티티 생성 및 저장
        const turn = new Turn();
        turn.turnNumber = turnData.turn;
        turn.eventText = turnData.event;
        turn.description = turnData.description || '';
        await manager.save(Turn, turn);

        // Choice 엔티티 생성 및 저장
        for (const choiceData of turnData.choices) {
          const choice = new Choice();
          choice.choiceId = choiceData.id;
          choice.turnNumber = turnData.turn;
          choice.text = choiceData.text;
          choice.effects = {
            users: choiceData.effects.users || 0,
            cash: choiceData.effects.cash || 0,
            trust: choiceData.effects.trust || 0,
            infra: choiceData.effects.infra || [],
          };
          choice.nextTurn = choiceData.next_turn;
          choice.category = choiceData.category || '';
          choice.description = choiceData.description || '';
          await manager.save(Choice, choice);
          totalChoices++;
        }

        console.log(
          `✅ 턴 ${turnData.turn} 임포트 완료 (선택지 ${turnData.choices.length}개)`,
        );
      }
    });

    console.log('');
    console.log('🎉 게임 데이터 임포트 성공!');
    console.log(`   - 턴 수: ${gameData.length}개`);
    console.log(`   - 선택지 수: ${totalChoices}개`);

    // 데이터 검증
    const turnCount = await turnRepository.count();
    const choiceCount = await choiceRepository.count();
    console.log('');
    console.log('🔍 데이터베이스 검증:');
    console.log(`   - DB에 저장된 턴: ${turnCount}개`);
    console.log(`   - DB에 저장된 선택지: ${choiceCount}개`);

    if (turnCount === gameData.length && choiceCount === totalChoices) {
      console.log('✅ 데이터 무결성 확인 완료!');
    } else {
      console.error('❌ 데이터 불일치 발견!');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ 데이터 임포트 중 오류 발생:', error);
    process.exit(1);
  } finally {
    await connection.close();
  }
}

// 스크립트 실행
importGameData()
  .then(() => {
    console.log('');
    console.log('✨ 임포트 프로세스 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 치명적 오류:', error);
    process.exit(1);
  });
