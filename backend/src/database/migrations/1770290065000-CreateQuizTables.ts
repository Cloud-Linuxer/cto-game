import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migration: CreateQuizTables
 *
 * Creates two tables for the Quiz System (EPIC-07):
 * 1. quizzes - Stores quiz questions, answers, and metadata
 * 2. quiz_history - Tracks player quiz attempts and results
 *
 * Compatible with both PostgreSQL and SQLite databases.
 */
export class CreateQuizTables1770290065000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable uuid-ossp extension for UUID generation (PostgreSQL)
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create quizzes table
    await queryRunner.createTable(
      new Table({
        name: 'quizzes',
        columns: [
          {
            name: 'quizId',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'type',
            type: 'varchar',
            length: '20',
            default: "'MULTIPLE_CHOICE'",
          },
          {
            name: 'difficulty',
            type: 'varchar',
            length: '10',
            default: "'MEDIUM'",
          },
          {
            name: 'question',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'options',
            type: 'text',
            isNullable: true,
            comment: 'JSON array for multiple choice options',
          },
          {
            name: 'correctAnswer',
            type: 'varchar',
            length: '10',
            isNullable: false,
          },
          {
            name: 'explanation',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'infraContext',
            type: 'text',
            default: "'[]'",
            comment: 'JSON array of related AWS services',
          },
          {
            name: 'turnRangeStart',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'turnRangeEnd',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'source',
            type: 'varchar',
            length: '20',
            default: "'LLM'",
          },
          {
            name: 'qualityScore',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'usageCount',
            type: 'int',
            default: '0',
          },
          {
            name: 'correctAnswerCount',
            type: 'int',
            default: '0',
          },
          {
            name: 'totalAnswerCount',
            type: 'int',
            default: '0',
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes for quizzes table
    await queryRunner.createIndex(
      'quizzes',
      new TableIndex({
        name: 'IDX_QUIZ_DIFFICULTY_TYPE',
        columnNames: ['difficulty', 'type'],
      }),
    );

    await queryRunner.createIndex(
      'quizzes',
      new TableIndex({
        name: 'IDX_QUIZ_SOURCE',
        columnNames: ['source'],
      }),
    );

    // Create quiz_history table
    await queryRunner.createTable(
      new Table({
        name: 'quiz_history',
        columns: [
          {
            name: 'historyId',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'gameId',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'quizId',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'turnNumber',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'playerAnswer',
            type: 'varchar',
            length: '10',
            isNullable: false,
          },
          {
            name: 'isCorrect',
            type: 'boolean',
            isNullable: false,
          },
          {
            name: 'timeTaken',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'quizType',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'difficulty',
            type: 'varchar',
            length: '10',
            isNullable: false,
          },
          {
            name: 'infraContext',
            type: 'text',
            isNullable: true,
            comment: 'JSON array of infrastructure context at quiz time',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes for quiz_history table
    await queryRunner.createIndex(
      'quiz_history',
      new TableIndex({
        name: 'IDX_QUIZ_HISTORY_GAME_TURN',
        columnNames: ['gameId', 'turnNumber'],
      }),
    );

    await queryRunner.createIndex(
      'quiz_history',
      new TableIndex({
        name: 'IDX_QUIZ_HISTORY_GAME_QUIZ',
        columnNames: ['gameId', 'quizId'],
      }),
    );

    await queryRunner.createIndex(
      'quiz_history',
      new TableIndex({
        name: 'IDX_QUIZ_HISTORY_QUIZ_ID',
        columnNames: ['quizId'],
      }),
    );

    await queryRunner.createIndex(
      'quiz_history',
      new TableIndex({
        name: 'IDX_QUIZ_HISTORY_GAME_ID',
        columnNames: ['gameId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes for quiz_history table (in reverse order)
    await queryRunner.dropIndex('quiz_history', 'IDX_QUIZ_HISTORY_GAME_ID');
    await queryRunner.dropIndex('quiz_history', 'IDX_QUIZ_HISTORY_QUIZ_ID');
    await queryRunner.dropIndex('quiz_history', 'IDX_QUIZ_HISTORY_GAME_QUIZ');
    await queryRunner.dropIndex('quiz_history', 'IDX_QUIZ_HISTORY_GAME_TURN');

    // Drop quiz_history table
    await queryRunner.dropTable('quiz_history');

    // Drop indexes for quizzes table
    await queryRunner.dropIndex('quizzes', 'IDX_QUIZ_SOURCE');
    await queryRunner.dropIndex('quizzes', 'IDX_QUIZ_DIFFICULTY_TYPE');

    // Drop quizzes table
    await queryRunner.dropTable('quizzes');
  }
}
