import { Module } from '@nestjs/common';
import { SecureRandomService } from './secure-random.service';
import { EventStateValidatorService } from './event-state-validator.service';
import { EventGuardService } from './event-guard.service';
import { InputSanitizerService } from './input-sanitizer.service';

/**
 * 보안 모듈
 *
 * 게임 이벤트 시스템 및 전반적인 애플리케이션 보안 기능 제공
 *
 * 제공 서비스:
 * - SecureRandomService: 암호학적 안전 난수 생성
 * - EventStateValidatorService: 게임 상태 무결성 검증
 * - EventGuardService: 이벤트 실행 권한 및 속도 제한
 * - InputSanitizerService: 입력 데이터 정제 및 XSS 방지
 */
@Module({
  providers: [
    SecureRandomService,
    EventStateValidatorService,
    EventGuardService,
    InputSanitizerService,
  ],
  exports: [
    SecureRandomService,
    EventStateValidatorService,
    EventGuardService,
    InputSanitizerService,
  ],
})
export class SecurityModule {}
