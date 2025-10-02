const { Client } = require('pg');

async function forceClear() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'cto_admin',
    password: 'cto_game_password',
    database: 'cto_game',
  });

  await client.connect();

  try {
    console.log('🔄 Force clearing all data...');

    // Use raw client instead of TypeORM
    await client.query('BEGIN');
    await client.query('DELETE FROM games');
    await client.query('DELETE FROM choices');
    await client.query('DELETE FROM turns');
    await client.query('COMMIT');

    console.log('✅ Data forcefully cleared');

    // Verify
    const result = await client.query('SELECT COUNT(*) FROM turns');
    console.log(`Turns remaining: ${result.rows[0].count}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', err.message);
    throw err;
  } finally {
    await client.end();
  }
}

forceClear().catch(console.error);
