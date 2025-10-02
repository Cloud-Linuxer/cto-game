const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../game_choices_db.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

console.log('🔧 Fixing duplicate choice IDs...\n');

let nextAvailableId = Math.max(...data.flatMap(turn => turn.choices.map(c => c.id))) + 1;
const usedIds = new Set();
let fixCount = 0;

data.forEach((turn, turnIdx) => {
  turn.choices.forEach((choice, choiceIdx) => {
    if (usedIds.has(choice.id)) {
      const oldId = choice.id;
      choice.id = nextAvailableId++;
      console.log(`   Turn ${turn.turn}: Changed duplicate ID ${oldId} → ${choice.id}`);
      fixCount++;
    }
    usedIds.add(choice.id);
  });
});

if (fixCount > 0) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`\n✅ Fixed ${fixCount} duplicate IDs`);
  console.log(`📝 Updated ${filePath}`);
} else {
  console.log('\n✅ No duplicates to fix');
}
