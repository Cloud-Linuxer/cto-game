import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Leaderboard } from '../database/entities/leaderboard.entity';
import { GameResponseDto } from '../common/dto/game-response.dto';
import { DIFFICULTY_CONFIGS, VICTORY_PATH_CONDITIONS, DifficultyMode, VictoryPath } from '../game/game-constants';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(Leaderboard)
    private leaderboardRepository: Repository<Leaderboard>,
  ) {}

  // 점수 계산 로직 (난이도 배율 적용)
  calculateScore(gameState: GameResponseDto): number {
    // 유저수 점수 (1명당 1점)
    const userScore = gameState.users;

    // 금액 점수 (1만원당 1점)
    const cashScore = Math.floor(gameState.cash / 10000);

    // 신뢰도 점수 (1%당 1000점)
    const trustScore = gameState.trust * 1000;

    // 기본 점수
    const baseScore = userScore + cashScore + trustScore;

    // 난이도 배율 적용
    const mode = (gameState.difficultyMode || 'NORMAL') as DifficultyMode;
    const config = DIFFICULTY_CONFIGS[mode] || DIFFICULTY_CONFIGS.NORMAL;
    let score = Math.floor(baseScore * config.scoreMultiplier);

    // 승리 경로 배율 적용
    if (gameState.victoryPath) {
      const vpConditions = VICTORY_PATH_CONDITIONS[mode]?.[gameState.victoryPath as VictoryPath];
      if (vpConditions) {
        score = Math.floor(score * vpConditions.scoreMultiplier);
      }
    }

    return score;
  }

  // 리더보드에 기록 추가
  async addScore(playerName: string, gameState: GameResponseDto): Promise<Leaderboard> {
    const score = this.calculateScore(gameState);

    const leaderboardEntry = this.leaderboardRepository.create({
      playerName,
      score,
      finalTurn: gameState.currentTurn,
      finalUsers: gameState.users,
      finalCash: gameState.cash,
      finalTrust: gameState.trust,
      finalInfrastructure: gameState.infrastructure,
      teamSize: gameState.hiredStaff ? gameState.hiredStaff.length : 0,
      difficulty: gameState.difficultyMode || 'NORMAL',
      victoryPath: gameState.victoryPath || gameState.status || 'WON_IPO',
    });

    return await this.leaderboardRepository.save(leaderboardEntry);
  }

  // 상위 리더보드 조회
  async getTopScores(limit: number = 10): Promise<Leaderboard[]> {
    return await this.leaderboardRepository.find({
      order: { score: 'DESC' },
      take: limit,
    });
  }

  // 전체 리더보드 조회 (페이지네이션)
  async getLeaderboard(page: number = 1, limit: number = 20): Promise<{
    data: Leaderboard[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.leaderboardRepository.findAndCount({
      order: { score: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 플레이어의 순위 조회
  async getPlayerRank(score: number): Promise<number> {
    const count = await this.leaderboardRepository.count({
      where: { score: MoreThan(score) },
    });
    return count + 1;
  }

  // 최근 기록 조회
  async getRecentScores(limit: number = 10): Promise<Leaderboard[]> {
    return await this.leaderboardRepository.find({
      order: { achievedAt: 'DESC' },
      take: limit,
    });
  }

  // 통계 조회
  async getStatistics(): Promise<{
    totalGames: number;
    averageScore: number;
    highestScore: number;
    averageTurn: number;
  }> {
    const stats = await this.leaderboardRepository
      .createQueryBuilder('leaderboard')
      .select('COUNT(*)', 'totalGames')
      .addSelect('AVG(leaderboard.score)', 'averageScore')
      .addSelect('MAX(leaderboard.score)', 'highestScore')
      .addSelect('AVG(leaderboard."finalTurn")', 'averageTurn')
      .getRawOne();

    return {
      totalGames: parseInt(stats.totalGames) || 0,
      averageScore: Math.floor(parseFloat(stats.averageScore) || 0),
      highestScore: parseInt(stats.highestScore) || 0,
      averageTurn: Math.floor(parseFloat(stats.averageTurn) || 0),
    };
  }

  // 리더보드 초기화
  async clearAll(): Promise<number> {
    const allRecords = await this.leaderboardRepository.find();
    if (allRecords.length === 0) {
      return 0;
    }
    await this.leaderboardRepository.remove(allRecords);
    return allRecords.length;
  }
}
