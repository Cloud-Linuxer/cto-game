import { TrustChangeFactor } from '../../database/entities/trust-history.entity';

/**
 * TrustHistory API 응답 DTO
 */
export class TrustHistoryResponseDto {
  id: number;
  gameId: string;
  turnNumber: number;
  trustBefore: number;
  trustAfter: number;
  change: number;
  factors: TrustChangeFactor[];
  createdAt: Date;
}
