import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

async function seedDatabase() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'cto_admin',
    password: process.env.DB_PASSWORD || 'cto_game_password',
    database: process.env.DB_NAME || 'cto_game',
    entities: [path.join(__dirname, 'entities/*.entity.{ts,js}')],
    synchronize: true,
  });

  await dataSource.initialize();

  // Explicitly create database schema
  await dataSource.synchronize();

  console.log('📊 Reading game choices data...');
  const gameData = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../../../game_choices_db.json'), 'utf8')
  );

  console.log(`Found ${gameData.length} turns`);

  // Clear existing data (check if tables exist first)
  console.log('🗑️  Clearing existing data...');
  try {
    await dataSource.query('DELETE FROM choices');
    await dataSource.query('DELETE FROM turns');
  } catch (error) {
    console.log('Tables will be created by synchronize');
  }

  // Import turns and choices
  console.log('📝 Importing turns and choices...');

  for (const turnData of gameData) {
    // Insert turn
    const turnResult = await dataSource.query(
      'INSERT INTO turns ("turnNumber", "eventText", description) VALUES ($1, $2, $3)',
      [turnData.turn, turnData.event, '']
    );

    // Insert choices
    for (const choiceData of turnData.choices) {
      await dataSource.query(
        `INSERT INTO choices (
          "choiceId", "turnNumber", text, effects, "nextTurn", category, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          choiceData.id,
          turnData.turn,
          choiceData.text,
          JSON.stringify(choiceData.effects),
          choiceData.next_turn || turnData.turn + 1,
          '',
          ''
        ]
      );
    }

    console.log(`✅ Turn ${turnData.turn} imported with ${turnData.choices.length} choices`);
  }

  const totalChoices = gameData.reduce((sum, turn) => sum + turn.choices.length, 0);
  console.log(`\n🎉 Import complete!`);
  console.log(`Total turns: ${gameData.length}`);
  console.log(`Total choices: ${totalChoices}`);

  await dataSource.destroy();
}

seedDatabase().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
