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

// 비용을 한글 표기로 변환하는 함수
const formatCost = (amount: number): string => {
  const absAmount = Math.abs(amount);

  if (absAmount >= 100000000) {
    const yi = Math.floor(absAmount / 100000000);
    const remainder = absAmount % 100000000;
    if (remainder === 0) {
      return amount < 0 ? `-${yi}억 원` : `${yi}억 원`;
    } else if (remainder % 10000000 === 0) {
      const chun = remainder / 10000000;
      return amount < 0 ? `-${yi}억 ${chun}천만 원` : `${yi}억 ${chun}천만 원`;
    } else {
      const man = Math.floor(remainder / 10000);
      return amount < 0 ? `-${yi}억 ${man}만 원` : `${yi}억 ${man}만 원`;
    }
  } else if (absAmount >= 10000) {
    const man = absAmount / 10000;
    return amount < 0 ? `-${man}만 원` : `${man}만 원`;
  } else if (absAmount >= 1000) {
    const chun = absAmount / 1000;
    if (chun % 1 === 0) {
      return amount < 0 ? `-${chun}천 원` : `${chun}천 원`;
    } else {
      // 8000원 = 8천 원
      const chun = Math.floor(absAmount / 1000);
      return amount < 0 ? `-${chun}천 원` : `${chun}천 원`;
    }
  } else {
    return amount < 0 ? `-${absAmount}원` : `${absAmount}원`;
  }
};

const fixAllTurnsText = async () => {
  await dataSource.initialize();

  console.log('\n=== Turn 4-25 텍스트 수정 시작 ===\n');

  // Turn 4부터 25까지 모든 선택지 가져오기
  const allChoices = await dataSource
    .createQueryBuilder()
    .select('choice')
    .from(Choice, 'choice')
    .where('choice.turnNumber >= :minTurn', { minTurn: 4 })
    .andWhere('choice.turnNumber <= :maxTurn', { maxTurn: 25 })
    .orderBy('choice.turnNumber')
    .addOrderBy('choice.choiceId')
    .getMany();

  let fixedCount = 0;
  const mismatches: any[] = [];

  for (const choice of allChoices) {
    const textCostMatch = choice.text.match(/💰[^:]+:\s*([^\n]+)/);

    if (textCostMatch && choice.effects.cash !== 0) {
      const textCost = textCostMatch[1].trim();
      const expectedCost = formatCost(choice.effects.cash);

      // 텍스트에 표시된 비용과 DB 값이 다른 경우
      if (!textCost.includes(expectedCost.replace('-', '').replace('+', ''))) {
        const oldText = choice.text;
        const newText = oldText.replace(/💰[^:]+:\s*[^\n]+/, `💰 비용: ${expectedCost}`);

        // "월", "/월" 처리를 위한 추가 로직
        if (textCost.includes('/월') || textCost.includes('월 ')) {
          const expectedCostMonthly = expectedCost + '/월';
          if (!textCost.includes(expectedCostMonthly.replace('-', ''))) {
            mismatches.push({
              choiceId: choice.choiceId,
              turnNumber: choice.turnNumber,
              title: choice.text.split('\n')[0],
              textCost,
              dbCash: choice.effects.cash,
              expectedCost: expectedCostMonthly
            });

            // 수정
            await dataSource
              .getRepository(Choice)
              .update({ choiceId: choice.choiceId }, {
                text: oldText.replace(/💰[^:]+:\s*[^\n]+/, `💰 비용: ${expectedCostMonthly}`)
              });

            fixedCount++;
            console.log(`[Fixed] Choice ${choice.choiceId} (Turn ${choice.turnNumber}): ${textCost} → ${expectedCostMonthly}`);
          }
        } else {
          mismatches.push({
            choiceId: choice.choiceId,
            turnNumber: choice.turnNumber,
            title: choice.text.split('\n')[0],
            textCost,
            dbCash: choice.effects.cash,
            expectedCost
          });

          // 수정
          await dataSource
            .getRepository(Choice)
            .update({ choiceId: choice.choiceId }, { text: newText });

          fixedCount++;
          console.log(`[Fixed] Choice ${choice.choiceId} (Turn ${choice.turnNumber}): ${textCost} → ${expectedCost}`);
        }
      }
    } else if (choice.effects.cash > 0 && !choice.text.includes('💰')) {
      // 수익이 있는데 비용 표시가 없는 경우
      const expectedCost = '+' + formatCost(choice.effects.cash);
      console.log(`[Info] Choice ${choice.choiceId} (Turn ${choice.turnNumber}): 수익 ${expectedCost} (텍스트에 표시 없음)`);
    }
  }

  console.log('\n=== 수정 결과 요약 ===');
  console.log(`검사한 선택지: ${allChoices.length}개`);
  console.log(`수정한 선택지: ${fixedCount}개`);

  if (mismatches.length > 0) {
    console.log('\n=== 수정된 선택지 상세 ===');
    let currentTurn = 0;
    mismatches.forEach(m => {
      if (m.turnNumber !== currentTurn) {
        currentTurn = m.turnNumber;
        console.log(`\n[Turn ${currentTurn}]`);
      }
      console.log(`  Choice ${m.choiceId}: ${m.title}`);
      console.log(`    이전: ${m.textCost}`);
      console.log(`    수정: ${m.expectedCost}`);
    });
  }

  await dataSource.destroy();
};

fixAllTurnsText()
  .then(() => {
    console.log('\n✅ Turn 4-25 텍스트 수정 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fixing all turns text:', error);
    process.exit(1);
  });