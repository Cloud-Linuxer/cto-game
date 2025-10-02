const { DataSource } = require('typeorm');

const dataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'cto_admin',
  password: 'cto_game_password',
  database: 'cto_game',
});

async function checkChoices() {
  await dataSource.initialize();

  const allChoices = await dataSource.query('SELECT "choiceId", "turnNumber" FROM choices ORDER BY "choiceId"');
  console.log('All choice IDs:', allChoices.map(c => `${c.choiceId} (turn ${c.turnNumber})`).join(', '));

  const turns = await dataSource.query('SELECT "turnNumber" FROM turns ORDER BY "turnNumber"');
  console.log('All turns:', turns.map(t => t.turnNumber).join(', '));

  await dataSource.destroy();
}

checkChoices().catch(console.error);
