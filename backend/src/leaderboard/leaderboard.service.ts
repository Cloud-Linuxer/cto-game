import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Leaderboard } from '../database/entities/leaderboard.entity';
import { GameState } from '../database/entities/game.entity';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(Leaderboard)
    private leaderboardRepository: Repository<Leaderboard>,
  ) {}

  // 점수 계산 로직 (유저수, 금액, 신뢰도만 사용)
  calculateScore(gameState: GameState): number {
    // 유저수 점수 (1명당 1점)
    const userScore = gameState.users;

    // 금액 점수 (1만원당 1점)
    const cashScore = Math.floor(gameState.cash / 10000);

    // 신뢰도 점수 (1%당 1000점)
    const trustScore = gameState.trust * 1000;

    // 총 점수 = 유저수 + 금액점수 + 신뢰도점수
    const score = userScore + cashScore + trustScore;

    return score;
  }

  // 리더보드에 기록 추가
  async addScore(playerName: string, gameState: GameState): Promise<Leaderboard> {
    const score = this.calculateScore(gameState);

    const leaderboardEntry = this.leaderboardRepository.create({
      playerName,
      score,
      finalTurn: gameState.currentTurn,
      finalUsers: gameState.users,
      finalCash: gameState.cash,
      finalTrust: gameState.trust,
      finalInfrastructure: gameState.infrastructure,
      teamSize: gameState.teamSize,
      difficulty: 'NORMAL', // 추후 난이도 기능 추가 시 변경
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
      where: { score: score + 1 }, // score보다 높은 점수의 개수
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
      .addSelect('AVG(score)', 'averageScore')
      .addSelect('MAX(score)', 'highestScore')
      .addSelect('AVG(finalTurn)', 'averageTurn')
      .getRawOne();

    return {
      totalGames: parseInt(stats.totalGames) || 0,
      averageScore: Math.floor(parseFloat(stats.averageScore) || 0),
      highestScore: parseInt(stats.highestScore) || 0,
      averageTurn: Math.floor(parseFloat(stats.averageTurn) || 0),
    };
  }
}