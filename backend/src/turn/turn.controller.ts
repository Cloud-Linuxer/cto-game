import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { TurnService } from './turn.service';
import { TurnResponseDto } from '../common/dto';

@ApiTags('turn')
@Controller('turn')
export class TurnController {
  constructor(private readonly turnService: TurnService) {}

  @Get()
  @ApiOperation({ summary: '모든 턴 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '턴 목록 조회 성공',
    type: [TurnResponseDto],
  })
  async getAllTurns(): Promise<TurnResponseDto[]> {
    return this.turnService.getAllTurns();
  }

  @Get(':turnNumber')
  @ApiOperation({ summary: '특정 턴 정보 조회' })
  @ApiParam({ name: 'turnNumber', description: '턴 번호', type: Number })
  @ApiResponse({
    status: 200,
    description: '턴 정보 조회 성공',
    type: TurnResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: '턴을 찾을 수 없습니다',
  })
  async getTurnInfo(
    @Param('turnNumber', ParseIntPipe) turnNumber: number,
  ): Promise<TurnResponseDto> {
    return this.turnService.getTurnInfo(turnNumber);
  }
}
