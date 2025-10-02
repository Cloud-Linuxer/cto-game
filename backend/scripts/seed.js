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
    path.join(__dirname, '../src/**/*.entity{.ts,.js}'),
  ],
  synchronize: false,
});

async function seed() {
  try {
    console.log('🔌 Connecting to database...');
    await dataSource.initialize();

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    console.log('🗑️  Clearing existing data...');
    await queryRunner.query('TRUNCATE games, choices, turns RESTART IDENTITY CASCADE');

    console.log('📊 Loading game data...');
    const gameData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../game_choices_db.json'), 'utf8')
    );

    console.log('💾 Seeding database...');

    await queryRunner.startTransaction();

    try {
      for (const turnData of gameData) {
        const turnResult = await queryRunner.query(
          'INSERT INTO turns (turn_number, quarter, scenario) VALUES ($1, $2, $3) RETURNING id',
          [turnData.turn, turnData.quarter, turnData.scenario]
        );
        const turnId = turnResult[0].id;

        for (const choice of turnData.choices) {
          await queryRunner.query(
            'INSERT INTO choices (id, turn_id, title, category, cost, effects, next_turn) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [
              choice.id,
              turnId,
              choice.title,
              choice.category,
              choice.cost,
              JSON.stringify(choice.effects),
              choice.next_turn || null,
            ]
          );
        }
      }

      await queryRunner.commitTransaction();
      console.log(`✅ Successfully seeded ${gameData.length} turns with ${gameData.reduce((sum, t) => sum + t.choices.length, 0)} choices`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

seed();
