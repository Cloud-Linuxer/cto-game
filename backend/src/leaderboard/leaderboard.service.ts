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

  // 점수 계산 로직
  calculateScore(gameState: GameState): number {
    let score = 0;

    // 기본 점수 (사용자 수, 자금, 신뢰도)
    score += Math.min(gameState.users, 200000); // 최대 200,000점
    score += Math.min(Math.floor(gameState.cash / 1000), 500000); // 최대 500,000점 (1000원당 1점)
    score += gameState.trust * 1000; // 신뢰도 * 1000

    // 턴 보너스 (빨리 클리어할수록 높은 점수)
    const turnBonus = Math.max(0, (26 - gameState.currentTurn) * 10000);
    score += turnBonus;

    // 인프라 보너스
    const infraBonus = {
      'EC2': 1000,
      'RDS': 5000,
      'Aurora': 10000,
      'ELB': 8000,
      'AutoScaling': 12000,
      'ElastiCache': 15000,
      'EKS': 25000,
      'Karpenter': 20000,
      'Aurora Global DB': 30000,
      'CloudFront': 18000,
      'WAF': 10000,
      'Bedrock': 22000,
      'SageMaker': 25000,
    };

    gameState.infrastructure.forEach(infra => {
      score += infraBonus[infra] || 0;
    });

    // 팀 크기 보너스
    score += gameState.teamSize * 5000;

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