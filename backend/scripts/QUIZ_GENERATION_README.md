# Quiz Generation Scripts - README

## Overview

This directory contains scripts for generating and seeding 100 pre-generated fallback quizzes for the AWS Startup Tycoon quiz system (EPIC-07 Task #26).

## Scripts

### 1. generate-fallback-quizzes.ts

Generates 100 fallback quizzes using the LLM Quiz Generator with quality validation.

**Distribution:**
- 40 EASY quizzes (Turns 1-10: EC2, S3, basic networking)
- 40 MEDIUM quizzes (Turns 11-20: Aurora, ALB, auto-scaling)
- 20 HARD quizzes (Turns 21-25: EKS, multi-region, advanced)

**Quiz Types:**
- 70% Multiple Choice (4 options)
- 30% OX quizzes

**Quality Criteria:**
- Minimum quality score: 70/100 (higher than production threshold of 60)
- 3-stage validation: Structure → Balance → Content
- Retry logic with max 3x attempts per quiz

**Infrastructure Contexts:**

*EASY (10 contexts):*
- Single services: EC2, S3, RDS, CloudFront, VPC, IAM
- Basic combinations: EC2+S3, EC2+RDS, EC2+CloudFront, S3+CloudFront

*MEDIUM (10 contexts):*
- Aurora+EC2, ALB+EC2+AutoScaling, Aurora+Redis
- CloudFront+S3+ALB, Aurora+Multi-AZ
- ElastiCache+EC2, CloudWatch+EC2, Route53+ALB
- VPC+Aurora, Lambda+API Gateway

*HARD (10 contexts):*
- EKS+Karpenter, Aurora Global DB, EKS+ALB+Aurora
- Multi-region+Aurora Global DB, EKS+Bedrock+Aurora
- CloudFront+Aurora Global DB+Multi-region
- EKS+SageMaker, Glue+Athena+QuickSight
- Kinesis+Lambda, ECS+Fargate

**Output:**
- JSON file: `backend/data/fallback-quizzes.json`
- Statistics report with quality metrics

**Usage:**
```bash
cd backend
npm run quiz:generate
```

**Expected Output:**
```
Generating 40 EASY quizzes...
============================================================
  Generated 1/40 (2.5%) - Quality: 85/100 - Type: MULTIPLE_CHOICE
  Generated 2/40 (5.0%) - Quality: 78/100 - Type: OX
  ...

Successfully generated all 40 EASY quizzes

Generating 40 MEDIUM quizzes...
...

============================================================
Successfully generated 100 fallback quizzes
Saved to: /path/to/backend/data/fallback-quizzes.json
============================================================

Statistics:
------------------------------------------------------------
Total Quizzes: 100

By Difficulty:
  EASY:   40
  MEDIUM: 40
  HARD:   20

By Type:
  MULTIPLE_CHOICE: 70
  OX:              30

Quality Scores:
  Average: 78.5/100
  Range:   70-95
============================================================
```

---

### 2. seed-fallback-quizzes.ts

Imports generated quizzes from JSON file into the database with `source = FALLBACK`.

**Features:**
- Parses turn ranges (e.g., "1-10" → turnRangeStart: 1, turnRangeEnd: 10)
- Sets `source = FALLBACK` for all quizzes
- Sets `isActive = true` for immediate availability
- Initializes usage statistics (usageCount: 0, etc.)
- Validates database state after import

**Usage:**
```bash
cd backend
npm run quiz:seed
```

**Prerequisites:**
- `fallback-quizzes.json` must exist (run `npm run quiz:generate` first)

**Expected Output:**
```
Starting fallback quiz seeding...

Loading 100 fallback quizzes from /path/to/data/fallback-quizzes.json...
============================================================
  Imported 10/100 (10.0%)
  Imported 20/100 (20.0%)
  ...
  Imported 100/100 (100.0%)

============================================================
Successfully imported 100/100 fallback quizzes
============================================================

Verifying database state...

Database Statistics:
------------------------------------------------------------
Total quizzes in DB:     100
Fallback quizzes:        100
  EASY:                  40
  MEDIUM:                40
  HARD:                  20
============================================================
```

---

## NPM Scripts

Add to `backend/package.json`:

```json
{
  "scripts": {
    "quiz:generate": "ts-node scripts/generate-fallback-quizzes.ts",
    "quiz:seed": "ts-node scripts/seed-fallback-quizzes.ts",
    "quiz:full": "npm run quiz:generate && npm run quiz:seed"
  }
}
```

**Commands:**
- `npm run quiz:generate` - Generate 100 fallback quizzes to JSON
- `npm run quiz:seed` - Import JSON quizzes into database
- `npm run quiz:full` - Generate + seed in one command

---

## Data Structure

### fallback-quizzes.json Format

```json
[
  {
    "type": "MULTIPLE_CHOICE",
    "difficulty": "EASY",
    "question": "EC2 인스턴스를 시작할 때 반드시 지정해야 하는 필수 항목은?",
    "options": [
      "AMI (Amazon Machine Image)",
      "Elastic IP",
      "S3 버킷 이름",
      "RDS 엔드포인트"
    ],
    "correctAnswer": "A",
    "explanation": "EC2 인스턴스를 시작하려면 AMI를 반드시 지정해야 합니다. AMI는 운영체제와 초기 소프트웨어 구성을 포함하는 템플릿입니다. Elastic IP는 선택사항이며, S3와 RDS는 EC2 시작과 무관합니다.",
    "infraContext": ["EC2"],
    "qualityScore": 85,
    "turnRange": "1-10"
  },
  {
    "type": "OX",
    "difficulty": "MEDIUM",
    "question": "Aurora MySQL은 일반 RDS MySQL보다 최대 5배 빠른 성능을 제공한다.",
    "correctAnswer": "true",
    "explanation": "맞습니다. Aurora MySQL은 스토리지 계층을 재설계하여 일반 RDS MySQL 대비 최대 5배 빠른 처리량을 제공합니다. 또한 자동 복제와 지속적인 백업 기능을 제공합니다.",
    "infraContext": ["Aurora", "RDS"],
    "qualityScore": 78,
    "turnRange": "11-20"
  }
]
```

### Database Schema (Quiz Entity)

```typescript
@Entity('quizzes')
export class Quiz {
  @PrimaryGeneratedColumn('uuid')
  quizId: string;

  @Column({ type: 'varchar', length: 20 })
  type: QuizType; // MULTIPLE_CHOICE | OX

  @Column({ type: 'varchar', length: 10 })
  difficulty: QuizDifficulty; // EASY | MEDIUM | HARD

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'simple-json', nullable: true })
  options: string[]; // For MULTIPLE_CHOICE only

  @Column({ type: 'varchar', length: 10 })
  correctAnswer: string; // A/B/C/D or true/false

  @Column({ type: 'text' })
  explanation: string;

  @Column({ type: 'simple-json' })
  infraContext: string[];

  @Column({ type: 'int', nullable: true })
  turnRangeStart: number; // 1, 11, or 21

  @Column({ type: 'int', nullable: true })
  turnRangeEnd: number; // 10, 20, or 25

  @Column({ type: 'varchar', length: 20 })
  source: QuizSource; // FALLBACK | LLM | MANUAL

  @Column({ type: 'int', nullable: true })
  qualityScore: number; // 0-100

  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @Column({ type: 'int', default: 0 })
  correctAnswerCount: number;

  @Column({ type: 'int', default: 0 })
  totalAnswerCount: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

---

## Quality Validation

### 3-Stage Validation Process

**Stage 1: Structure Validation**
- Question length: 50-300 characters
- Options count: exactly 4 for MULTIPLE_CHOICE
- Correct answer format: A/B/C/D or true/false
- Explanation length: 100-500 characters
- No HTML tags or script injection

**Stage 2: Balance Validation**
- Difficulty alignment (complexity score vs difficulty)
- Option length balance (standard deviation < 30)
- No obvious answer patterns (e.g., longest option is always correct)
- No obvious keywords only in correct answer

**Stage 3: Content Quality Validation**
- Korean language ratio: ≥50%
- AWS terminology accuracy
- Educational value (Best Practices, reasoning)
- Content safety (no profanity, personal information)

### Quality Scoring (0-100)

**4 Dimensions (each 0-25 points):**

1. **Clarity (명확성):** Question clarity, option clarity, language quality
2. **Relevance (관련성):** Infrastructure context match, AWS accuracy, practical applicability
3. **Difficulty (난이도):** Difficulty alignment, knowledge depth, distractor quality
4. **Educational (교육성):** Learning value, explanation quality, actionable knowledge

**Minimum Threshold:**
- Production LLM generation: 60/100
- Fallback pool: 70/100 (higher quality requirement)

**Target Average:** 80/100

---

## Retry Logic

**Maximum Attempts:** 3x per quiz (total max attempts = count * 3)

**Retry Triggers:**
1. LLM API call failure
2. JSON parsing error
3. Validation failure (any stage)
4. Quality score below threshold (<70)

**Fallback Behavior:**
- If all retries exhausted, move to next quiz
- Warning logged for incomplete generation

---

## Troubleshooting

### Error: "File not found at backend/data/fallback-quizzes.json"

**Solution:** Run generation first:
```bash
npm run quiz:generate
```

### Error: "LLM API call failed"

**Possible causes:**
1. vLLM server not running
2. Network connection issues
3. LLM config incorrect

**Solution:**
1. Check LLM server status: `curl http://localhost:8000/health`
2. Verify `backend/src/config/llm.config.ts`
3. Check Redis connection

### Low Quality Scores (<70)

**Possible causes:**
1. LLM model quality issues
2. Prompt template needs improvement
3. Infrastructure context too broad

**Solution:**
1. Review generated quiz samples
2. Adjust prompt templates in `src/quiz/templates/quiz-prompt.template.ts`
3. Refine infrastructure context combinations

### Generation Timeout

**Solution:**
1. Increase `maxAttempts` in script (default: count * 3)
2. Lower quality threshold temporarily (e.g., 65 instead of 70)
3. Run in batches (modify script to generate 10 at a time)

---

## Performance

**Expected Generation Time:**
- Total: 20-30 minutes for 100 quizzes (with retries)
- Per quiz: 10-20 seconds (including validation + scoring)
- Retry overhead: ~30% of quizzes may need retries

**Seeding Time:**
- Total: <1 minute for 100 quizzes
- Database operations are fast (SQLite/TypeORM)

---

## Maintenance

### Updating Fallback Pool

1. **Re-generate all quizzes:**
   ```bash
   npm run quiz:full
   ```

2. **Add new quizzes (incremental):**
   - Modify `targets` array in generation script
   - Run generation for specific difficulty only
   - Manually merge with existing JSON

3. **Deactivate low-quality quizzes:**
   ```sql
   UPDATE quizzes SET isActive = false WHERE qualityScore < 70 AND source = 'FALLBACK';
   ```

### Monitoring Quality

Check accuracy rates:
```sql
SELECT
  difficulty,
  AVG(correctAnswerCount * 1.0 / NULLIF(totalAnswerCount, 0)) as accuracy_rate,
  AVG(qualityScore) as avg_quality
FROM quizzes
WHERE source = 'FALLBACK'
GROUP BY difficulty;
```

Low accuracy (<50%) may indicate:
- Question ambiguity
- Incorrect correct answer
- Misleading distractors

---

## References

- **EPIC-07:** LLM Quiz System
- **Task #26:** Generate 100 Fallback Quizzes
- **Related Services:**
  - `LLMQuizGeneratorService` (src/quiz/services/llm-quiz-generator.service.ts)
  - `QuizValidatorService` (src/quiz/validators/quiz-validator.service.ts)
  - `QuizQualityScorerService` (src/quiz/services/quiz-quality-scorer.service.ts)

---

## License

MIT

---

**Last Updated:** 2026-02-05
**Author:** Backend Team (EPIC-07 Task #26)
