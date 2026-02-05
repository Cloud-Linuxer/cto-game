# Database Migrations

This directory contains TypeORM migration files for the AWS Startup Tycoon backend database.

## Available Migrations

### 1770290065000-CreateQuizTables.ts

Creates the quiz system tables for EPIC-07:

**Tables Created:**

1. **quizzes** - Stores quiz questions and metadata
   - Primary Key: `quizId` (VARCHAR 36)
   - Contains: question, options, correct answer, explanation, difficulty, type
   - Statistics: usage count, correct answer count, accuracy tracking
   - Indexes: difficulty+type, source

2. **quiz_history** - Tracks player quiz attempts
   - Primary Key: `historyId` (AUTO INCREMENT)
   - Contains: gameId, quizId, turnNumber, player answer, correctness
   - Indexes: gameId+turnNumber, gameId+quizId, quizId, gameId

**Database Compatibility:** PostgreSQL and SQLite

## Migration Commands

### Run all pending migrations
```bash
npm run migration:run
```

### Revert the last migration
```bash
npm run migration:revert
```

### Show migration status
```bash
npm run migration:show
```

### Generate a new migration from entity changes
```bash
npm run migration:generate -- src/database/migrations/MigrationName
```

### Create an empty migration file
```bash
npm run migration:create -- src/database/migrations/MigrationName
```

## Migration Workflow

### Development Environment

1. **Create/modify entities** in `src/database/entities/`
2. **Generate migration** (if using auto-generation):
   ```bash
   npm run migration:generate -- src/database/migrations/YourMigrationName
   ```
3. **Review the generated migration** to ensure correctness
4. **Run the migration**:
   ```bash
   npm run migration:run
   ```
5. **Test the changes** with your application
6. **Commit both** the entity changes and migration file

### Testing Migrations

#### Test Up Migration
```bash
npm run migration:run
# Verify tables exist
# Run application tests
```

#### Test Down Migration
```bash
npm run migration:revert
# Verify tables are removed
# Re-run migration:run to restore
```

### Production Environment

1. **Set NODE_ENV to production** to disable synchronize
2. **Run migrations before deployment**:
   ```bash
   NODE_ENV=production npm run migration:run
   ```
3. **Verify migration success** before starting the application
4. **Have rollback plan ready** (migration:revert)

## Migration Best Practices

1. **Always review generated migrations** - Auto-generated migrations may need adjustments
2. **Test both up and down migrations** - Ensure reversibility
3. **Use transactions** - TypeORM wraps migrations in transactions by default
4. **Don't modify existing migrations** - Create new migrations for changes
5. **Document complex migrations** - Add comments explaining non-obvious logic
6. **Test on production-like data** - Use staging environment with similar data size
7. **Have rollback plan** - Test the down() method thoroughly

## Troubleshooting

### Migration already ran
```bash
# Check migration status
npm run migration:show

# If migration needs to be re-run, revert it first
npm run migration:revert
```

### Migration fails
```bash
# Check error message carefully
# Fix the migration file
# Revert if partially applied
npm run migration:revert
# Re-run after fixing
npm run migration:run
```

### Can't connect to database
```bash
# Check environment variables
echo $DB_HOST $DB_PORT $DB_NAME $DB_USER

# Verify database is running
# Check src/database/data-source.ts configuration
```

## Environment Variables

Required for migrations:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=cto_admin
DB_PASSWORD=cto_game_password
DB_NAME=cto_game
NODE_ENV=development
```

## Notes

- **synchronize: false** is enforced in production to prevent data loss
- Migrations are the **only** way to modify production database schema
- Always backup production database before running migrations
- TypeORM supports rollback via `migration:revert`, but test thoroughly first
