import { IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StartGameDto {
  @ApiProperty({
    description: '난이도 모드',
    enum: ['EASY', 'NORMAL', 'HARD'],
    default: 'NORMAL',
    required: false,
  })
  @IsOptional()
  @IsIn(['EASY', 'NORMAL', 'HARD'])
  difficulty?: 'EASY' | 'NORMAL' | 'HARD';
}
