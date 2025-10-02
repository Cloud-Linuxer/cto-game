const { DataSource } = require('typeorm');

const dataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'cto_admin',
  password: 'cto_game_password',
  database: 'cto_game',
});

async function checkDB() {
  await dataSource.initialize();

  console.log('📊 Checking database state...\n');

  // Check if tables exist
  const tables = await dataSource.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `);
  console.log('Tables:', tables.map(t => t.table_name));

  // Check data in each table
  if (tables.find(t => t.table_name === 'turns')) {
    const turns = await dataSource.query('SELECT COUNT(*) as count FROM turns');
    console.log('Turns count:', turns[0].count);
  }

  if (tables.find(t => t.table_name === 'choices')) {
    const choices = await dataSource.query('SELECT COUNT(*) as count FROM choices');
    console.log('Choices count:', choices[0].count);

    // Check if choice 23 exists
    const choice23 = await dataSource.query('SELECT "choiceId", text FROM choices WHERE "choiceId" = 23');
    console.log('Choice 23:', choice23[0] || 'Not found');
  }

  if (tables.find(t => t.table_name === 'games')) {
    const games = await dataSource.query('SELECT COUNT(*) as count FROM games');
    console.log('Games count:', games[0].count);
  }

  await dataSource.destroy();
}

checkDB().catch(console.error);
