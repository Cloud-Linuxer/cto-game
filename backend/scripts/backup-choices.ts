import { DataSource } from 'typeorm';
import { Choice } from '../src/database/entities/choice.entity';
import * as fs from 'fs';

const dataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'cto_admin',
  password: 'cto_game_password',
  database: 'cto_game',
  entities: [Choice],
  synchronize: false,
});

const backupChoices = async () => {
  await dataSource.initialize();

  // Get all choices
  const choices = await dataSource
    .createQueryBuilder()
    .select('choice')
    .from(Choice, 'choice')
    .orderBy('choice.turnNumber', 'ASC')
    .addOrderBy('choice.choiceId', 'ASC')
    .getMany();

  // Create backup file with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = `backup/choices_backup_${timestamp}.json`;

  // Create backup directory if it doesn't exist
  if (!fs.existsSync('backup')) {
    fs.mkdirSync('backup');
  }

  // Save to JSON file
  fs.writeFileSync(backupFile, JSON.stringify(choices, null, 2));

  console.log(`Backup saved to ${backupFile}`);
  console.log(`Total choices backed up: ${choices.length}`);

  await dataSource.destroy();
};

backupChoices()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error backing up choices:', error);
    process.exit(1);
  });