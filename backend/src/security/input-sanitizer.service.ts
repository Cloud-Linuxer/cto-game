import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';

/**
 * 입력 데이터 정제 및 XSS 방지 서비스
 *
 * 이벤트 템플릿 변수 및 사용자 입력 데이터 정제
 * XSS, SQL Injection, Command Injection 방지
 */
@Injectable()
export class InputSanitizerService {
  private readonly logger = new Logger(InputSanitizerService.name);

  // XSS 위험 패턴
  private readonly XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // onclick, onerror, onload 등
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<applet/gi,
    /eval\(/gi,
    /expression\(/gi,
  ];

  // SQL Injection 위험 패턴
  private readonly SQL_PATTERNS = [
    /(\bunion\b.*\bselect\b)/gi,
    /(\bdrop\b.*\btable\b)/gi,
    /(\bdelete\b.*\bfrom\b)/gi,
    /(\binsert\b.*\binto\b)/gi,
    /(\bupdate\b.*\bset\b)/gi,
    /(--|\#|\/\*|\*\/)/g, // SQL 주석
    /(\bor\b.*=.*\bor\b)/gi,
    /('|")\s*=\s*('|")/gi,
  ];

  // Command Injection 위험 패턴
  private readonly COMMAND_PATTERNS = [
    /[;&|`$()]/g, // Shell 특수문자
    /\$\{.*\}/g, // 변수 치환
    /\.\.\//g, // 경로 탐색
  ];

  // 허용된 HTML 태그 (화이트리스트)
  private readonly ALLOWED_TAGS = new Set([
    'b',
    'i',
    'u',
    'strong',
    'em',
    'br',
    'p',
    'span',
  ]);

  /**
   * 텍스트 정제 (XSS 방지)
   *
   * @param input 원본 텍스트
   * @param allowHtml HTML 태그 허용 여부
   * @returns 정제된 텍스트
   */
  sanitizeText(input: string, allowHtml: boolean = false): string {
    if (typeof input !== 'string') {
      this.logger.warn(`Invalid input type: ${typeof input}, expected string`);
      return '';
    }

    let sanitized = input;

    // 1. XSS 패턴 제거
    for (const pattern of this.XSS_PATTERNS) {
      if (pattern.test(sanitized)) {
        this.logger.warn(`XSS pattern detected: ${pattern.source}`);
        sanitized = sanitized.replace(pattern, '');
      }
    }

    // 2. HTML 처리
    if (!allowHtml) {
      // HTML 완전 제거
      sanitized = this.stripHtml(sanitized);
    } else {
      // 허용된 태그만 유지
      sanitized = this.sanitizeHtml(sanitized);
    }

    // 3. 길이 제한 (DoS 방지)
    const MAX_LENGTH = 10000;
    if (sanitized.length > MAX_LENGTH) {
      this.logger.warn(`Input too long: ${sanitized.length} chars, truncating to ${MAX_LENGTH}`);
      sanitized = sanitized.substring(0, MAX_LENGTH);
    }

    this.logger.verbose(`Sanitized text: ${input.substring(0, 50)}... -> ${sanitized.substring(0, 50)}...`);

    return sanitized;
  }

  /**
   * 템플릿 변수 정제
   *
   * 이벤트 텍스트 템플릿에 삽입될 변수 정제
   *
   * @param variables 템플릿 변수 객체
   * @returns 정제된 변수 객체
   */
  sanitizeTemplateVariables(
    variables: Record<string, any>,
  ): Record<string, string> {
    const sanitized: Record<string, string> = {};

    for (const [key, value] of Object.entries(variables)) {
      // 키 검증 (알파벳, 숫자, 언더스코어만 허용)
      if (!/^[a-zA-Z0-9_가-힣]+$/.test(key)) {
        this.logger.warn(`Invalid template variable key: ${key}`);
        throw new BadRequestException(
          `유효하지 않은 템플릿 변수 이름: ${key}`,
        );
      }

      // 값 정제
      if (typeof value === 'number') {
        sanitized[key] = this.sanitizeNumber(value).toString();
      } else if (typeof value === 'string') {
        sanitized[key] = this.sanitizeText(value, false);
      } else if (typeof value === 'boolean') {
        sanitized[key] = value.toString();
      } else if (Array.isArray(value)) {
        sanitized[key] = value
          .map((v) => this.sanitizeText(String(v), false))
          .join(', ');
      } else {
        this.logger.warn(`Unsupported variable type: ${typeof value} for key ${key}`);
        sanitized[key] = '';
      }
    }

    this.logger.verbose(`Sanitized ${Object.keys(sanitized).length} template variables`);

    return sanitized;
  }

  /**
   * SQL 파라미터 정제
   *
   * @param input SQL 쿼리 파라미터
   * @returns 정제된 파라미터
   */
  sanitizeSqlParameter(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    let sanitized = input;

    // SQL Injection 패턴 탐지
    for (const pattern of this.SQL_PATTERNS) {
      if (pattern.test(sanitized)) {
        this.logger.error(`SQL injection attempt detected: ${pattern.source}`);
        throw new BadRequestException(
          '유효하지 않은 입력 데이터입니다.',
        );
      }
    }

    // 특수문자 이스케이프 (Prepared Statement 사용 시 불필요하지만 방어적 코딩)
    sanitized = sanitized.replace(/'/g, "''"); // SQL 싱글쿼트 이스케이프

    return sanitized;
  }

  /**
   * 숫자 정제 및 검증
   *
   * @param input 숫자 입력
   * @param min 최소값
   * @param max 최대값
   * @returns 정제된 숫자
   */
  sanitizeNumber(
    input: number,
    min: number = Number.MIN_SAFE_INTEGER,
    max: number = Number.MAX_SAFE_INTEGER,
  ): number {
    if (typeof input !== 'number' || isNaN(input) || !isFinite(input)) {
      this.logger.warn(`Invalid number input: ${input}`);
      throw new BadRequestException('유효하지 않은 숫자입니다.');
    }

    if (input < min || input > max) {
      this.logger.warn(`Number out of range: ${input} (min: ${min}, max: ${max})`);
      throw new BadRequestException(
        `숫자는 ${min} ~ ${max} 범위 내여야 합니다.`,
      );
    }

    return input;
  }

  /**
   * 파일 경로 정제 (Path Traversal 방지)
   *
   * @param input 파일 경로
   * @returns 정제된 경로
   */
  sanitizeFilePath(input: string): string {
    if (typeof input !== 'string') {
      throw new BadRequestException('유효하지 않은 파일 경로입니다.');
    }

    // Path traversal 패턴 탐지
    if (/\.\.\//.test(input) || /\.\.\\/.test(input)) {
      this.logger.error(`Path traversal attempt detected: ${input}`);
      throw new BadRequestException('유효하지 않은 파일 경로입니다.');
    }

    // 절대 경로 금지
    if (input.startsWith('/') || /^[a-zA-Z]:/.test(input)) {
      this.logger.error(`Absolute path not allowed: ${input}`);
      throw new BadRequestException('절대 경로는 허용되지 않습니다.');
    }

    // 파일명만 추출 (경로 제거)
    const filename = input.split('/').pop()?.split('\\').pop() || '';

    // 파일명 검증 (알파벳, 숫자, 언더스코어, 하이픈, 점만 허용)
    if (!/^[a-zA-Z0-9_\-\.]+$/.test(filename)) {
      this.logger.error(`Invalid filename: ${filename}`);
      throw new BadRequestException('유효하지 않은 파일명입니다.');
    }

    return filename;
  }

  /**
   * UUID 검증
   *
   * @param input UUID 문자열
   * @returns 유효한 UUID 여부
   */
  validateUUID(input: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isValid = uuidRegex.test(input);

    if (!isValid) {
      this.logger.warn(`Invalid UUID format: ${input}`);
    }

    return isValid;
  }

  /**
   * JSON 파싱 및 정제
   *
   * @param input JSON 문자열
   * @param maxDepth 최대 중첩 깊이
   * @returns 파싱된 객체
   */
  sanitizeJson(input: string, maxDepth: number = 5): any {
    if (typeof input !== 'string') {
      throw new BadRequestException('유효하지 않은 JSON입니다.');
    }

    // 길이 제한 (DoS 방지)
    const MAX_JSON_LENGTH = 100000;
    if (input.length > MAX_JSON_LENGTH) {
      this.logger.error(`JSON too large: ${input.length} bytes`);
      throw new BadRequestException('JSON 데이터가 너무 큽니다.');
    }

    let parsed: any;

    try {
      parsed = JSON.parse(input);
    } catch (error) {
      this.logger.error(`JSON parse error: ${error.message}`);
      throw new BadRequestException('유효하지 않은 JSON 형식입니다.');
    }

    // 중첩 깊이 검증 (Billion laughs attack 방지)
    const depth = this.getObjectDepth(parsed);
    if (depth > maxDepth) {
      this.logger.error(`JSON depth too deep: ${depth} (max: ${maxDepth})`);
      throw new BadRequestException('JSON 중첩이 너무 깊습니다.');
    }

    return parsed;
  }

  /**
   * 객체 중첩 깊이 계산
   */
  private getObjectDepth(obj: any, currentDepth: number = 1): number {
    if (typeof obj !== 'object' || obj === null) {
      return currentDepth;
    }

    const depths = Object.values(obj).map((value) =>
      this.getObjectDepth(value, currentDepth + 1),
    );

    return depths.length > 0 ? Math.max(...depths) : currentDepth;
  }

  /**
   * HTML 완전 제거
   */
  private stripHtml(input: string): string {
    return input
      .replace(/<[^>]*>/g, '') // 모든 태그 제거
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'");
  }

  /**
   * 허용된 HTML 태그만 유지
   */
  private sanitizeHtml(input: string): string {
    // 간단한 화이트리스트 기반 정제
    // 프로덕션에서는 DOMPurify 같은 라이브러리 사용 권장
    let sanitized = input;

    // 허용되지 않은 태그 제거
    sanitized = sanitized.replace(/<(\w+)[^>]*>/g, (match, tag) => {
      if (this.ALLOWED_TAGS.has(tag.toLowerCase())) {
        return `<${tag}>`; // 속성 제거
      }
      return ''; // 태그 전체 제거
    });

    // 닫는 태그도 검증
    sanitized = sanitized.replace(/<\/(\w+)>/g, (match, tag) => {
      if (this.ALLOWED_TAGS.has(tag.toLowerCase())) {
        return match;
      }
      return '';
    });

    return sanitized;
  }

  /**
   * 컨텐츠 보안 해시 생성 (CSP)
   *
   * @param content 컨텐츠
   * @returns SHA-256 해시
   */
  generateContentHash(content: string): string {
    const hash = createHash('sha256')
      .update(content)
      .digest('base64');

    return `sha256-${hash}`;
  }

  /**
   * 입력값 길이 검증
   *
   * @param input 입력값
   * @param maxLength 최대 길이
   * @param fieldName 필드명 (에러 메시지용)
   */
  validateLength(input: string, maxLength: number, fieldName: string = '입력값'): void {
    if (input.length > maxLength) {
      this.logger.warn(`Input too long for ${fieldName}: ${input.length} (max: ${maxLength})`);
      throw new BadRequestException(
        `${fieldName}은(는) 최대 ${maxLength}자까지 입력 가능합니다.`,
      );
    }
  }

  /**
   * 배열 크기 검증
   *
   * @param array 배열
   * @param maxSize 최대 크기
   * @param fieldName 필드명
   */
  validateArraySize(array: any[], maxSize: number, fieldName: string = '배열'): void {
    if (!Array.isArray(array)) {
      throw new BadRequestException(`${fieldName}은(는) 배열이어야 합니다.`);
    }

    if (array.length > maxSize) {
      this.logger.warn(`Array too large for ${fieldName}: ${array.length} (max: ${maxSize})`);
      throw new BadRequestException(
        `${fieldName}은(는) 최대 ${maxSize}개까지 허용됩니다.`,
      );
    }
  }
}
