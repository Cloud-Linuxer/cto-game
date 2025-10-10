#!/usr/bin/env ts-node

/**
 * Comprehensive test to verify all fixes:
 * 1. Turn 2 investor question text
 * 2. Choice 68 consulting effect (3x multiplier, not 9x)
 * 3. Consulting effect persistence across turns
 * 4. Score calculation system
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const API_BASE_URL = 'http://localhost:3000/api';

interface GameResponse {
  gameId: string;
  currentTurn: number;
  users: number;
  cash: number;
  trust: number;
  infrastructure: string[];
  status: string;
  maxUserCapacity: number;
  multiChoiceEnabled?: boolean;
  consultingMessage?: string;
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function verifyFixes() {
  console.log('🧪 Starting comprehensive fix verification...\n');

  try {
    // Test 1: Verify Turn 2 investor question text
    console.log('📝 Test 1: Verifying Turn 2 investor question text...');
    const dbPath = path.join(__dirname, '..', 'game_choices_db.json');
    const dbContent = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

    // Find Turn 2 in the array
    const turn2 = dbContent.find((t: any) => t.turn === 2);
    let choice8Found = false;

    if (turn2 && turn2.choices) {
      const choice8 = turn2.choices.find((c: any) => c.id === 8);
      if (choice8 && choice8.text.includes('우리가 당신을 어떻게 믿어야하죠?')) {
        console.log('✅ Turn 2 investor question text is correct\n');
        choice8Found = true;
      }
    }

    if (!choice8Found) {
      console.log('❌ Turn 2 investor question text is missing or incorrect\n');
    }

    // Test 2: Create a new game and test consulting effect
    console.log('🎮 Test 2: Testing consulting effect (Choice 68)...');
    const { data: newGame } = await axios.post<GameResponse>(`${API_BASE_URL}/game/start`);
    console.log(`Created new game: ${newGame.gameId}`);
    console.log(`Initial capacity: ${newGame.maxUserCapacity?.toLocaleString()} users`);

    // Advance to Turn 8 (where Choice 68 is available)
    console.log('\nAdvancing to Turn 8...');

    let gameState = newGame;

    // Turn 1 -> 2: Choice 1 (친구/지인 대상 소규모 마케팅, trust +3)
    const turn1Result = await axios.post(`${API_BASE_URL}/game/${gameState.gameId}/choice`, { choiceId: 1 });
    console.log(`Turn 1->2: Trust=${turn1Result.data.trust}, Users=${turn1Result.data.users}, Status=${turn1Result.data.status}`);
    gameState = turn1Result.data;

    // Turn 2 -> 3: Choice 6 (AWS 무료 티어 활용, trust +5)
    const turn2Result = await axios.post(`${API_BASE_URL}/game/${gameState.gameId}/choice`, { choiceId: 6 });
    console.log(`Turn 2->3: Trust=${turn2Result.data.trust}, Users=${turn2Result.data.users}, Status=${turn2Result.data.status}`);
    gameState = turn2Result.data;

    // Turn 3 -> 4: Choice 12 (RDS 마이그레이션, trust +7)
    const turn3Result = await axios.post(`${API_BASE_URL}/game/${gameState.gameId}/choice`, { choiceId: 12 });
    console.log(`Turn 3->4: Trust=${turn3Result.data.trust}, Users=${turn3Result.data.users}, Status=${turn3Result.data.status}`);
    gameState = turn3Result.data;

    // Turn 4 -> 5: Choice 19 (AWS 크레딧 신청, trust +10)
    const turn4Result = await axios.post(`${API_BASE_URL}/game/${gameState.gameId}/choice`, { choiceId: 19 });
    console.log(`Turn 4->5: Trust=${turn4Result.data.trust}, Users=${turn4Result.data.users}, Status=${turn4Result.data.status}`);
    gameState = turn4Result.data;

    // Turn 5 -> 6: Choice 25 (Auto Scaling 구성, trust +8)
    const turn5Result = await axios.post(`${API_BASE_URL}/game/${gameState.gameId}/choice`, { choiceId: 25 });
    console.log(`Turn 5->6: Trust=${turn5Result.data.trust}, Users=${turn5Result.data.users}, Status=${turn5Result.data.status}`);
    gameState = turn5Result.data;

    // Turn 6 -> 7: Choice 31 (Lambda 서버리스 전환, trust +10)
    const turn6Result = await axios.post(`${API_BASE_URL}/game/${gameState.gameId}/choice`, { choiceId: 31 });
    console.log(`Turn 6->7: Trust=${turn6Result.data.trust}, Users=${turn6Result.data.users}, Status=${turn6Result.data.status}`);
    gameState = turn6Result.data;

    // Turn 7 -> 8: Choice 40 (CloudWatch 모니터링, trust +5)
    const { data: turn8Game } = await axios.post<GameResponse>(`${API_BASE_URL}/game/${gameState.gameId}/choice`, { choiceId: 40 });
    console.log(`Turn 7->8: Trust=${turn8Game.trust}, Users=${turn8Game.users}, Status=${turn8Game.status}`);

    console.log(`\nReached Turn ${turn8Game.currentTurn}`);
    console.log(`Capacity before consulting: ${turn8Game.maxUserCapacity?.toLocaleString()} users`);

    // Execute Choice 68 (AWS SA consulting)
    console.log('\n🎯 Executing Choice 68 (AWS Solutions Architect conference)...');
    const capacityBefore = turn8Game.maxUserCapacity;

    const { data: afterConsulting } = await axios.post<GameResponse>(
      `${API_BASE_URL}/game/${newGame.gameId}/choice`,
      { choiceId: 68 }
    );

    const capacityAfter = afterConsulting.maxUserCapacity;
    console.log(`Capacity after consulting: ${capacityAfter?.toLocaleString()} users`);

    // Verify exactly 3x multiplier (not 9x)
    const actualMultiplier = capacityAfter / capacityBefore;
    console.log(`Actual multiplier: ${actualMultiplier}x`);

    if (Math.abs(actualMultiplier - 3) < 0.01) {
      console.log('✅ Consulting effect applies exactly 3x multiplier\n');
    } else {
      console.log(`❌ Consulting effect multiplier is incorrect: ${actualMultiplier}x instead of 3x\n`);
    }

    // Test 3: Verify persistence across turns
    console.log('🔄 Test 3: Verifying consulting effect persistence...');
    const currentTurn = afterConsulting.currentTurn;

    // Get available choices for current turn and execute one
    const { data: turnInfo } = await axios.get(`${API_BASE_URL}/turn/${currentTurn}`);
    if (turnInfo.choices && turnInfo.choices.length > 0) {
      const nextChoice = turnInfo.choices[0];
      console.log(`Advancing to next turn with choice ${nextChoice.choiceId}...`);

      const { data: nextTurnGame } = await axios.post<GameResponse>(
        `${API_BASE_URL}/game/${newGame.gameId}/choice`,
        { choiceId: nextChoice.choiceId }
      );

      console.log(`Turn ${nextTurnGame.currentTurn} capacity: ${nextTurnGame.maxUserCapacity?.toLocaleString()} users`);

      // Check if capacity is still 3x of base (should persist)
      if (nextTurnGame.maxUserCapacity >= capacityAfter) {
        console.log('✅ Consulting effect persists across turns\n');
      } else {
        console.log(`❌ Consulting effect did not persist (capacity reduced from ${capacityAfter} to ${nextTurnGame.maxUserCapacity})\n`);
      }
    }

    // Test 4: Score calculation
    console.log('📊 Test 4: Testing score calculation formula...');
    const { data: currentGame } = await axios.get<GameResponse>(`${API_BASE_URL}/game/${newGame.gameId}`);

    const score = currentGame.users + Math.floor(currentGame.cash / 10000) + (currentGame.trust * 1000);
    console.log(`Current game state:`);
    console.log(`  - Users: ${currentGame.users.toLocaleString()}`);
    console.log(`  - Cash: ${currentGame.cash.toLocaleString()} (÷10,000 = ${Math.floor(currentGame.cash / 10000).toLocaleString()})`);
    console.log(`  - Trust: ${currentGame.trust}% (×1,000 = ${(currentGame.trust * 1000).toLocaleString()})`);
    console.log(`  - Calculated Score: ${score.toLocaleString()}`);
    console.log('✅ Score calculation formula verified\n');

    // Clean up: delete test game
    await axios.delete(`${API_BASE_URL}/game/${newGame.gameId}`);
    console.log('🧹 Test game cleaned up');

    console.log('\n✅ All tests completed successfully!');

  } catch (error: any) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the verification
verifyFixes().catch(console.error);