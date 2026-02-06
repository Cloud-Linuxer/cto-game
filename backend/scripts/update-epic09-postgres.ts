/**
 * Update PostgreSQL database with EPIC-09 changes
 */
import { createConnection } from 'typeorm';
import { Choice } from '../src/database/entities/choice.entity';
import { databaseConfig } from '../src/database/database.config';

async function updateEpic09() {
  console.log('🔄 Updating PostgreSQL with EPIC-09 changes...\n');

  const connection = await createConnection({
    ...databaseConfig,
    entities: [Choice],
  } as any);

  try {
    const choiceRepo = connection.getRepository(Choice);

    // Update Choice 157
    const choice157 = await choiceRepo.findOne({ where: { choiceId: 157 } });
    if (choice157) {
      const oldEffects = choice157.effects;
      choice157.effects = {
        users: 120000,
        cash: -200000000,
        trust: 0,
        infra: [],
      };
      await choiceRepo.save(choice157);
      console.log('✅ Choice 157 updated:');
      console.log(`   Old: ${JSON.stringify(oldEffects)}`);
      console.log(`   New: ${JSON.stringify(choice157.effects)}\n`);
    } else {
      console.log('❌ Choice 157 not found\n');
    }

    // Update Choice 160
    const choice160 = await choiceRepo.findOne({ where: { choiceId: 160 } });
    if (choice160) {
      const oldEffects = choice160.effects;
      choice160.effects = {
        users: 150000,
        cash: -240000000,
        trust: 4,
        infra: [],
      };
      await choiceRepo.save(choice160);
      console.log('✅ Choice 160 updated:');
      console.log(`   Old: ${JSON.stringify(oldEffects)}`);
      console.log(`   New: ${JSON.stringify(choice160.effects)}\n`);
    } else {
      console.log('❌ Choice 160 not found\n');
    }

    // Verify updates
    console.log('🔍 Verifying updates...\n');
    const verify157 = await choiceRepo.findOne({ where: { choiceId: 157 } });
    const verify160 = await choiceRepo.findOne({ where: { choiceId: 160 } });

    console.log('Choice 157:', verify157?.effects);
    console.log('Choice 160:', verify160?.effects);

    console.log('\n✅ EPIC-09 database update complete!');
  } finally {
    await connection.close();
  }
}

updateEpic09().catch((error) => {
  console.error('❌ Update failed:', error);
  process.exit(1);
});
