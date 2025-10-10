import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { LeaderboardService } from './leaderboard.service';
import { GameService } from '../game/game.service';
import { Leaderboard } from '../database/entities/leaderboard.entity';

class AddScoreDto {
  @ApiProperty({ description: '플레이어 이름' })
  @IsString()
  @IsNotEmpty()
  playerName: string;

  @ApiProperty({ description: '게임 ID' })
  @IsString()
  @IsNotEmpty()
  gameId: string;
}

@ApiTags('leaderboard')
@Controller('leaderboard')
export class LeaderboardController {
  constructor(
    private readonly leaderboardService: LeaderboardService,
    private readonly gameService: GameService,
  ) {}

  @Post('submit')
  @ApiOperation({ summary: 'IPO 성공 시 점수 제출' })
  @ApiResponse({ status: 201, description: '점수가 성공적으로 저장되었습니다.' })
  async submitScore(@Body() dto: AddScoreDto): Promise<{
    entry: Leaderboard;
    rank: number;
  }> {
    // 게임 상태 확인
    const gameState = await this.gameService.getGame(dto.gameId);

    if (gameState.status !== 'WON_IPO') {
      throw new Error('IPO를 달성하지 못한 게임입니다.');
    }

    // 리더보드에 추가
    const entry = await this.leaderboardService.addScore(dto.playerName, gameState);

    // 순위 계산
    const rank = await this.leaderboardService.getPlayerRank(entry.score);

    return { entry, rank };
  }

  @Get('top')
  @ApiOperation({ summary: '상위 점수 조회' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '조회할 개수 (기본: 10)' })
  async getTopScores(@Query('limit') limit: number = 10): Promise<Leaderboard[]> {
    return await this.leaderboardService.getTopScores(limit);
  }

  @Get()
  @ApiOperation({ summary: '전체 리더보드 조회 (페이지네이션)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '페이지 번호 (기본: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '페이지당 개수 (기본: 20)' })
  async getLeaderboard(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return await this.leaderboardService.getLeaderboard(page, limit);
  }

  @Get('recent')
  @ApiOperation({ summary: '최근 기록 조회' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '조회할 개수 (기본: 10)' })
  async getRecentScores(@Query('limit') limit: number = 10): Promise<Leaderboard[]> {
    return await this.leaderboardService.getRecentScores(limit);
  }

  @Get('statistics')
  @ApiOperation({ summary: '리더보드 통계 조회' })
  async getStatistics() {
    return await this.leaderboardService.getStatistics();
  }

  @Get('rank/:score')
  @ApiOperation({ summary: '특정 점수의 순위 조회' })
  async getRank(@Param('score') score: number): Promise<{ rank: number }> {
    const rank = await this.leaderboardService.getPlayerRank(score);
    return { rank };
  }

  @Post('clear')
  @ApiOperation({ summary: '리더보드 초기화 (개발용)' })
  @ApiResponse({ status: 200, description: '리더보드가 초기화되었습니다.' })
  async clearLeaderboard(): Promise<{ message: string; deletedCount: number }> {
    const deletedCount = await this.leaderboardService.clearAll();
    return {
      message: '리더보드가 초기화되었습니다.',
      deletedCount,
    };
  }
}