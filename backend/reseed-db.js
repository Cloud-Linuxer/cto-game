const { DataSource } = require('typeorm');
const fs = require('fs');
const path = require('path');

const dataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'cto_admin',
  password: 'cto_game_password',
  database: 'cto_game',
  entities: [
    path.join(__dirname, 'src/database/entities/*.entity.js'),
  ],
  synchronize: false,
});

async function reseedDatabase() {
  await dataSource.initialize();

  console.log('🔄 Clearing existing data...');

  // Terminate all other connections to the database
  try {
    await dataSource.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = 'cto_game'
        AND pid <> pg_backend_pid()
    `);
  } catch (err) {
    console.log('No other connections to terminate');
  }

  // Start explicit transaction
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Delete all data first (respecting foreign keys)
    await queryRunner.query('DELETE FROM games');
    await queryRunner.query('DELETE FROM choices');
    await queryRunner.query('DELETE FROM turns');

    // Commit the deletes
    await queryRunner.commitTransaction();
    console.log('✅ Data cleared, tables still exist');
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.release();
  }

  console.log('📊 Seeding database...');
  const gameData = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'game_choices_db.json'), 'utf8')
  );

  for (const turnData of gameData) {
    await dataSource.query(
      'INSERT INTO turns ("turnNumber", "eventText", description) VALUES ($1, $2, $3)',
      [turnData.turn, turnData.event, '']
    );

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
          choiceData.next_turn,
          '',
          ''
        ]
      );
    }
  }

  console.log(`✅ Seeded ${gameData.length} turns`);

  await dataSource.destroy();
}

reseedDatabase().catch(console.error);
