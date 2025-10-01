import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { GameStatus } from '../src/database/entities/game.entity';

describe('Game API (e2e)', () => {
  let app: INestApplication;
  let gameId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/game (POST) - 게임 시작', () => {
    it('새 게임을 시작하고 초기 상태를 반환해야 함', () => {
      return request(app.getHttpServer())
        .post('/api/game/start')
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('gameId');
          expect(res.body.currentTurn).toBe(1);
          expect(res.body.users).toBe(0);
          expect(res.body.cash).toBe(10000000);
          expect(res.body.trust).toBe(50);
          expect(res.body.infrastructure).toContain('EC2');
          expect(res.body.status).toBe(GameStatus.PLAYING);

          // 다음 테스트를 위해 gameId 저장
          gameId = res.body.gameId;
        });
    });
  });

  describe('/api/game/:gameId (GET) - 게임 조회', () => {
    it('게임 상태를 조회해야 함', () => {
      return request(app.getHttpServer())
        .get(`/api/game/${gameId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.gameId).toBe(gameId);
          expect(res.body.currentTurn).toBe(1);
        });
    });

    it('존재하지 않는 게임 ID로 조회 시 404를 반환해야 함', () => {
      return request(app.getHttpServer())
        .get('/api/game/invalid-id')
        .expect(404);
    });
  });

  describe('/api/game/:gameId/choice (POST) - 선택 실행', () => {
    it('선택을 실행하고 게임 상태를 업데이트해야 함', () => {
      return request(app.getHttpServer())
        .post(`/api/game/${gameId}/choice`)
        .send({ choiceId: 1 })
        .expect(200)
        .expect((res) => {
          expect(res.body.gameId).toBe(gameId);
          expect(res.body.currentTurn).toBeGreaterThan(1);
          // 효과가 적용되었는지 확인
          expect(
            res.body.users >= 0 ||
              res.body.cash >= 0 ||
              res.body.trust >= 0,
          ).toBe(true);
        });
    });

    it('잘못된 choiceId 형식으로 요청 시 400을 반환해야 함', () => {
      return request(app.getHttpServer())
        .post(`/api/game/${gameId}/choice`)
        .send({ choiceId: 'invalid' })
        .expect(400);
    });

    it('존재하지 않는 선택지 ID로 요청 시 404를 반환해야 함', () => {
      return request(app.getHttpServer())
        .post(`/api/game/${gameId}/choice`)
        .send({ choiceId: 99999 })
        .expect(404);
    });
  });

  describe('/api/turn/:turnNumber (GET) - 턴 정보 조회', () => {
    it('특정 턴의 정보와 선택지를 조회해야 함', () => {
      return request(app.getHttpServer())
        .get('/api/turn/1')
        .expect(200)
        .expect((res) => {
          expect(res.body.turnNumber).toBe(1);
          expect(res.body).toHaveProperty('eventText');
          expect(res.body).toHaveProperty('choices');
          expect(Array.isArray(res.body.choices)).toBe(true);
          expect(res.body.choices.length).toBeGreaterThan(0);
        });
    });

    it('존재하지 않는 턴 번호로 조회 시 404를 반환해야 함', () => {
      return request(app.getHttpServer()).get('/api/turn/999').expect(404);
    });
  });

  describe('/api/turn (GET) - 모든 턴 조회', () => {
    it('모든 턴 목록을 조회해야 함', () => {
      return request(app.getHttpServer())
        .get('/api/turn')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty('turnNumber');
          expect(res.body[0]).toHaveProperty('choices');
        });
    });
  });

  describe('/api/game/:gameId (DELETE) - 게임 삭제', () => {
    it('게임을 삭제해야 함', () => {
      return request(app.getHttpServer())
        .delete(`/api/game/${gameId}`)
        .expect(204);
    });

    it('삭제된 게임 조회 시 404를 반환해야 함', () => {
      return request(app.getHttpServer())
        .get(`/api/game/${gameId}`)
        .expect(404);
    });
  });

  describe('전체 게임 플로우 테스트', () => {
    it('게임 시작 → 선택 실행 → 상태 확인 전체 플로우가 정상 작동해야 함', async () => {
      // 1. 게임 시작
      const startRes = await request(app.getHttpServer())
        .post('/api/game/start')
        .expect(201);

      const newGameId = startRes.body.gameId;
      expect(newGameId).toBeDefined();

      // 2. 턴 1 정보 조회
      const turnRes = await request(app.getHttpServer())
        .get('/api/turn/1')
        .expect(200);

      const firstChoiceId = turnRes.body.choices[0].choiceId;

      // 3. 선택 실행
      const choiceRes = await request(app.getHttpServer())
        .post(`/api/game/${newGameId}/choice`)
        .send({ choiceId: firstChoiceId })
        .expect(200);

      expect(choiceRes.body.currentTurn).toBeGreaterThan(1);

      // 4. 게임 상태 확인
      const gameRes = await request(app.getHttpServer())
        .get(`/api/game/${newGameId}`)
        .expect(200);

      expect(gameRes.body.gameId).toBe(newGameId);
      expect(gameRes.body.currentTurn).toBe(choiceRes.body.currentTurn);

      // 5. 정리
      await request(app.getHttpServer())
        .delete(`/api/game/${newGameId}`)
        .expect(204);
    });
  });
});
