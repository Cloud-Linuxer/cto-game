import { Injectable, Logger } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';

/**
 * 암호학적으로 안전한 난수 생성 서비스
 *
 * 게임 이벤트 시스템에서 예측 불가능한 시드 생성을 위해 사용
 * crypto 모듈 기반으로 보안 강화된 랜덤 생성
 */
@Injectable()
export class SecureRandomService {
  private readonly logger = new Logger(SecureRandomService.name);

  /**
   * 암호학적으로 안전한 난수 생성 (0 ~ max-1)
   *
   * @param max 최대값 (exclusive)
   * @returns 0 이상 max 미만의 정수
   */
  generateSecureInt(max: number): number {
    if (max <= 0 || !Number.isInteger(max)) {
      throw new Error(`Invalid max value: ${max}. Must be positive integer.`);
    }

    // Special case: max=1 always returns 0
    if (max === 1) {
      return 0;
    }

    // Prevent modulo bias by using rejection sampling
    const range = max;
    const bytesNeeded = Math.ceil(Math.log2(range) / 8);
    const maxValid = Math.floor(256 ** bytesNeeded / range) * range;

    let randomValue: number;
    let attempts = 0;
    const MAX_ATTEMPTS = 100;

    do {
      const randomBuffer = randomBytes(bytesNeeded);
      randomValue = randomBuffer.readUIntBE(0, bytesNeeded);
      attempts++;

      if (attempts >= MAX_ATTEMPTS) {
        this.logger.error(`Failed to generate secure random after ${MAX_ATTEMPTS} attempts`);
        throw new Error('Secure random generation failed: exceeded maximum attempts');
      }
    } while (randomValue >= maxValid);

    const result = randomValue % range;

    this.logger.verbose(`Generated secure random: ${result} (max: ${max}, attempts: ${attempts})`);

    return result;
  }

  /**
   * 암호학적으로 안전한 부동소수점 난수 생성 (0.0 ~ 1.0)
   *
   * @returns 0.0 이상 1.0 미만의 부동소수점
   */
  generateSecureFloat(): number {
    const buffer = randomBytes(8);
    const randomInt = buffer.readBigUInt64BE(0);
    const maxInt = BigInt('0xFFFFFFFFFFFFFFFF');

    const result = Number(randomInt) / Number(maxInt);

    this.logger.verbose(`Generated secure float: ${result.toFixed(6)}`);

    return result;
  }

  /**
   * 게임 턴 및 메트릭 기반 시드 생성
   *
   * 동일한 게임 상태에서도 예측 불가능한 시드를 생성하여
   * 재시작 공격(replay attack) 방지
   *
   * @param gameId 게임 식별자
   * @param turn 현재 턴
   * @param users 유저 수
   * @param cash 현금
   * @returns 256비트 시드 (hex string)
   */
  generateEventSeed(
    gameId: string,
    turn: number,
    users: number,
    cash: number,
  ): string {
    // 현재 타임스탬프 + 나노초 정밀도
    const timestamp = Date.now();
    const nanotime = process.hrtime.bigint();

    // 암호학적 랜덤 솔트 추가
    const salt = randomBytes(32).toString('hex');

    // 게임 상태 기반 입력값 조합
    const inputData = `${gameId}:${turn}:${users}:${cash}:${timestamp}:${nanotime}:${salt}`;

    // SHA-256 해시 생성 (256비트 시드)
    const seed = createHash('sha256')
      .update(inputData)
      .digest('hex');

    this.logger.debug(
      `Generated event seed for game ${gameId}, turn ${turn}: ${seed.substring(0, 16)}...`,
    );

    return seed;
  }

  /**
   * 시드 기반 가중치 랜덤 선택
   *
   * @param seed 시드 문자열
   * @param weights 가중치 배열 (합이 1.0이 아니어도 자동 정규화)
   * @returns 선택된 인덱스
   */
  selectWeightedIndex(seed: string, weights: number[]): number {
    if (weights.length === 0) {
      throw new Error('Weights array cannot be empty');
    }

    if (weights.some(w => w < 0)) {
      throw new Error('All weights must be non-negative');
    }

    // 가중치 정규화
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    if (totalWeight === 0) {
      throw new Error('Total weight cannot be zero');
    }

    const normalizedWeights = weights.map(w => w / totalWeight);

    // 시드를 해싱하여 0~1 범위 난수 생성
    const hash = createHash('sha256').update(seed).digest();
    const randomValue = hash.readUInt32BE(0) / 0xFFFFFFFF;

    // 누적 확률로 선택
    let cumulative = 0;
    for (let i = 0; i < normalizedWeights.length; i++) {
      cumulative += normalizedWeights[i];
      if (randomValue < cumulative) {
        this.logger.verbose(
          `Weighted selection: index ${i} (random: ${randomValue.toFixed(4)}, cumulative: ${cumulative.toFixed(4)})`,
        );
        return i;
      }
    }

    // 부동소수점 오차 방지: 마지막 인덱스 반환
    return weights.length - 1;
  }

  /**
   * 범위 내 랜덤 정수 생성 (시드 기반)
   *
   * @param seed 시드 문자열
   * @param min 최소값 (inclusive)
   * @param max 최대값 (exclusive)
   * @returns min 이상 max 미만의 정수
   */
  generateSeededInt(seed: string, min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max)) {
      throw new Error('Min and max must be integers');
    }

    if (min >= max) {
      throw new Error(`Invalid range: min (${min}) must be less than max (${max})`);
    }

    const hash = createHash('sha256').update(seed).digest();
    const randomValue = hash.readUInt32BE(0);
    const range = max - min;
    const result = min + (randomValue % range);

    this.logger.verbose(
      `Generated seeded int: ${result} (seed: ${seed.substring(0, 8)}..., range: ${min}-${max})`,
    );

    return result;
  }

  /**
   * UUID v4 생성 (암호학적 안전)
   *
   * @returns UUID v4 문자열
   */
  generateSecureUUID(): string {
    const buffer = randomBytes(16);

    // Set version to 4 (random UUID)
    buffer[6] = (buffer[6] & 0x0f) | 0x40;
    // Set variant to RFC4122
    buffer[8] = (buffer[8] & 0x3f) | 0x80;

    const uuid = buffer.toString('hex');
    const formatted = [
      uuid.substring(0, 8),
      uuid.substring(8, 12),
      uuid.substring(12, 16),
      uuid.substring(16, 20),
      uuid.substring(20, 32),
    ].join('-');

    this.logger.verbose(`Generated secure UUID: ${formatted}`);

    return formatted;
  }

  /**
   * 토큰 생성 (API 키, 세션 토큰 등)
   *
   * @param length 토큰 길이 (바이트)
   * @returns Base64 인코딩된 토큰
   */
  generateSecureToken(length: number = 32): string {
    if (length <= 0 || length > 1024) {
      throw new Error(`Invalid token length: ${length}. Must be between 1 and 1024.`);
    }

    const buffer = randomBytes(length);
    const token = buffer.toString('base64url');

    this.logger.debug(`Generated secure token (${length} bytes): ${token.substring(0, 16)}...`);

    return token;
  }

  /**
   * 시드 검증 (해시 무결성 확인)
   *
   * @param seed 검증할 시드
   * @returns 시드가 유효한 SHA-256 해시인지 여부
   */
  validateSeed(seed: string): boolean {
    // SHA-256은 64자의 16진수 문자열
    const isValid = /^[a-f0-9]{64}$/i.test(seed);

    if (!isValid) {
      this.logger.warn(`Invalid seed format: ${seed.substring(0, 16)}...`);
    }

    return isValid;
  }
}
