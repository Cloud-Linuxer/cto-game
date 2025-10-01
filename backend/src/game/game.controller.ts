import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { GameService } from './game.service';
import { GameResponseDto, ExecuteChoiceDto } from '../common/dto';

@ApiTags('game')
@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post('start')
  @ApiOperation({ summary: '새 게임 시작' })
  @ApiResponse({
    status: 201,
    description: '게임이 성공적으로 시작되었습니다',
    type: GameResponseDto,
  })
  async startGame(): Promise<GameResponseDto> {
    return this.gameService.startGame();
  }

  @Get(':gameId')
  @ApiOperation({ summary: '게임 상태 조회' })
  @ApiParam({ name: 'gameId', description: '게임 ID' })
  @ApiResponse({
    status: 200,
    description: '게임 상태 조회 성공',
    type: GameResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: '게임을 찾을 수 없습니다',
  })
  async getGame(@Param('gameId') gameId: string): Promise<GameResponseDto> {
    return this.gameService.getGame(gameId);
  }

  @Post(':gameId/choice')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '선택 실행' })
  @ApiParam({ name: 'gameId', description: '게임 ID' })
  @ApiBody({ type: ExecuteChoiceDto })
  @ApiResponse({
    status: 200,
    description: '선택이 성공적으로 실행되었습니다',
    type: GameResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청 (게임 종료됨, 잘못된 턴의 선택지 등)',
  })
  @ApiResponse({
    status: 404,
    description: '게임 또는 선택지를 찾을 수 없습니다',
  })
  async executeChoice(
    @Param('gameId') gameId: string,
    @Body() dto: ExecuteChoiceDto,
  ): Promise<GameResponseDto> {
    return this.gameService.executeChoice(gameId, dto.choiceId);
  }

  @Delete(':gameId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '게임 삭제' })
  @ApiParam({ name: 'gameId', description: '게임 ID' })
  @ApiResponse({
    status: 204,
    description: '게임이 성공적으로 삭제되었습니다',
  })
  @ApiResponse({
    status: 404,
    description: '게임을 찾을 수 없습니다',
  })
  async deleteGame(@Param('gameId') gameId: string): Promise<void> {
    return this.gameService.deleteGame(gameId);
  }
}
