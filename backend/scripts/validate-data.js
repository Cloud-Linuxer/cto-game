const fs = require('fs');
const path = require('path');

const data = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../game_choices_db.json'), 'utf8')
);

const allIds = [];
const duplicates = [];
const idToTurns = {};

console.log('🔍 Validating game data...\n');

data.forEach((turn) => {
  turn.choices.forEach((choice) => {
    if (allIds.includes(choice.id)) {
      duplicates.push({
        id: choice.id,
        turns: [idToTurns[choice.id], turn.turn],
      });
    } else {
      idToTurns[choice.id] = turn.turn;
    }
    allIds.push(choice.id);
  });
});

console.log(`📊 Total turns: ${data.length}`);
console.log(`📋 Total choices: ${allIds.length}`);
console.log(`✨ Unique choice IDs: ${new Set(allIds).size}`);

if (duplicates.length > 0) {
  console.log(`\n❌ Found ${duplicates.length} duplicate choice IDs:`);
  duplicates.forEach((dup) => {
    console.log(`   ID ${dup.id} appears in turns: ${dup.turns.join(', ')}`);
  });
  process.exit(1);
} else {
  console.log('\n✅ No duplicates found!');
}

// Check for missing next_turn
const missingNextTurn = [];
data.forEach((turn) => {
  turn.choices.forEach((choice) => {
    if (!choice.next_turn && turn.turn !== data.length) {
      missingNextTurn.push({ choiceId: choice.id, turn: turn.turn });
    }
  });
});

if (missingNextTurn.length > 0) {
  console.log(`\n⚠️  ${missingNextTurn.length} choices missing next_turn:`);
  missingNextTurn.forEach((item) => {
    console.log(`   Choice ${item.choiceId} in turn ${item.turn}`);
  });
}

console.log('\n✅ Validation complete!');
