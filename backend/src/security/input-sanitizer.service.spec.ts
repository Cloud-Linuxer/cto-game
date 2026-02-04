import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { InputSanitizerService } from './input-sanitizer.service';

describe('InputSanitizerService', () => {
  let service: InputSanitizerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InputSanitizerService],
    }).compile();

    service = module.get<InputSanitizerService>(InputSanitizerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sanitizeText', () => {
    it('should return clean text as is', () => {
      const input = '안전한 텍스트입니다';
      const result = service.sanitizeText(input);

      expect(result).toBe(input);
    });

    it('should remove script tags', () => {
      const input = '<script>alert("XSS")</script>안전한 텍스트';
      const result = service.sanitizeText(input);

      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
      expect(result).toContain('안전한 텍스트');
    });

    it('should remove javascript: protocol', () => {
      const input = '<a href="javascript:alert(1)">클릭</a>';
      const result = service.sanitizeText(input);

      expect(result).not.toContain('javascript:');
    });

    it('should remove event handlers', () => {
      const input = '<div onclick="alert(1)">클릭</div>';
      const result = service.sanitizeText(input);

      expect(result).not.toContain('onclick');
    });

    it('should remove all HTML when allowHtml is false', () => {
      const input = '<div><strong>굵은 글씨</strong></div>';
      const result = service.sanitizeText(input, false);

      expect(result).not.toContain('<div>');
      expect(result).not.toContain('<strong>');
      expect(result).toContain('굵은 글씨');
    });

    it('should allow safe HTML tags when allowHtml is true', () => {
      const input = '<p><strong>안전한 태그</strong></p>';
      const result = service.sanitizeText(input, true);

      expect(result).toContain('<strong>');
      expect(result).toContain('<p>');
    });

    it('should truncate long input', () => {
      const input = 'a'.repeat(20000);
      const result = service.sanitizeText(input);

      expect(result.length).toBeLessThanOrEqual(10000);
    });

    it('should handle non-string input', () => {
      const result = service.sanitizeText(123 as any);
      expect(result).toBe('');
    });
  });

  describe('sanitizeTemplateVariables', () => {
    it('should sanitize valid variables', () => {
      const variables = {
        users: 1000,
        cash: 50000000,
        companyName: '스타트업',
        features: ['기능1', '기능2'],
      };

      const result = service.sanitizeTemplateVariables(variables);

      expect(result.users).toBe('1000');
      expect(result.cash).toBe('50000000');
      expect(result.companyName).toBe('스타트업');
      expect(result.features).toBe('기능1, 기능2');
    });

    it('should reject invalid variable names', () => {
      const variables = {
        'invalid-key': 'value',
      };

      expect(() => service.sanitizeTemplateVariables(variables)).toThrow(BadRequestException);
    });

    it('should sanitize XSS in variable values', () => {
      const variables = {
        name: '<script>alert(1)</script>회사',
      };

      const result = service.sanitizeTemplateVariables(variables);

      expect(result.name).not.toContain('<script>');
      expect(result.name).toContain('회사');
    });

    it('should handle boolean values', () => {
      const variables = {
        isActive: true,
        isDisabled: false,
      };

      const result = service.sanitizeTemplateVariables(variables);

      expect(result.isActive).toBe('true');
      expect(result.isDisabled).toBe('false');
    });
  });

  describe('sanitizeSqlParameter', () => {
    it('should allow safe SQL parameters', () => {
      const input = 'safe-value-123';
      const result = service.sanitizeSqlParameter(input);

      expect(result).toBe(input);
    });

    it('should detect SQL injection attempts', () => {
      const inputs = [
        'DROP TABLE users',
        'DELETE FROM games',
        'UNION SELECT password',
        'INSERT INTO users',
        'UPDATE games SET',
      ];

      inputs.forEach((input) => {
        expect(() => service.sanitizeSqlParameter(input)).toThrow(BadRequestException);
      });
    });

    it('should escape single quotes', () => {
      const input = "O'Reilly";
      const result = service.sanitizeSqlParameter(input);

      expect(result).toBe("O''Reilly"); // SQL escape
    });
  });

  describe('sanitizeNumber', () => {
    it('should accept valid numbers', () => {
      expect(service.sanitizeNumber(42)).toBe(42);
      expect(service.sanitizeNumber(0)).toBe(0);
      expect(service.sanitizeNumber(-100)).toBe(-100);
    });

    it('should reject invalid numbers', () => {
      expect(() => service.sanitizeNumber(NaN)).toThrow(BadRequestException);
      expect(() => service.sanitizeNumber(Infinity)).toThrow(BadRequestException);
      expect(() => service.sanitizeNumber('123' as any)).toThrow(BadRequestException);
    });

    it('should enforce min/max range', () => {
      expect(() => service.sanitizeNumber(50, 0, 40)).toThrow(BadRequestException);
      expect(() => service.sanitizeNumber(-10, 0, 100)).toThrow(BadRequestException);
      expect(service.sanitizeNumber(50, 0, 100)).toBe(50);
    });
  });

  describe('sanitizeFilePath', () => {
    it('should allow safe filenames', () => {
      const result = service.sanitizeFilePath('document.pdf');
      expect(result).toBe('document.pdf');
    });

    it('should prevent path traversal', () => {
      const inputs = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32',
        'subdir/../../../secret.txt',
      ];

      inputs.forEach((input) => {
        expect(() => service.sanitizeFilePath(input)).toThrow(BadRequestException);
      });
    });

    it('should reject absolute paths', () => {
      expect(() => service.sanitizeFilePath('/etc/passwd')).toThrow(BadRequestException);
      expect(() => service.sanitizeFilePath('C:\\Windows\\System32')).toThrow(BadRequestException);
    });

    it('should extract filename from path', () => {
      const result = service.sanitizeFilePath('uploads/documents/file.txt');
      expect(result).toBe('file.txt');
    });

    it('should reject invalid filenames', () => {
      expect(() => service.sanitizeFilePath('file<script>.txt')).toThrow(BadRequestException);
      expect(() => service.sanitizeFilePath('file;rm -rf.txt')).toThrow(BadRequestException);
    });
  });

  describe('validateUUID', () => {
    it('should accept valid UUIDs', () => {
      const validUUIDs = [
        // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx (y = 8, 9, a, or b)
        '123e4567-e89b-42d3-a456-426614174000',
        '550e8400-e29b-41d4-a716-446655440000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      ];

      validUUIDs.forEach((uuid) => {
        expect(service.validateUUID(uuid)).toBe(true);
      });
    });

    it('should reject invalid UUIDs', () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '123e4567-e89b-12d3-a456', // too short
        '123e4567-e89b-12d3-a456-426614174000-extra', // too long
        'g23e4567-e89b-12d3-a456-426614174000', // invalid char
      ];

      invalidUUIDs.forEach((uuid) => {
        expect(service.validateUUID(uuid)).toBe(false);
      });
    });
  });

  describe('sanitizeJson', () => {
    it('should parse valid JSON', () => {
      const json = '{"name": "테스트", "value": 123}';
      const result = service.sanitizeJson(json);

      expect(result.name).toBe('테스트');
      expect(result.value).toBe(123);
    });

    it('should reject invalid JSON', () => {
      const invalidJson = '{name: invalid}';
      expect(() => service.sanitizeJson(invalidJson)).toThrow(BadRequestException);
    });

    it('should reject too large JSON', () => {
      const largeJson = '{"data": "' + 'x'.repeat(200000) + '"}';
      expect(() => service.sanitizeJson(largeJson)).toThrow(BadRequestException);
    });

    it('should reject deeply nested JSON', () => {
      let nested = '{"a":';
      for (let i = 0; i < 10; i++) {
        nested += '{"b":';
      }
      nested += 'null';
      for (let i = 0; i < 10; i++) {
        nested += '}';
      }
      nested += '}';

      expect(() => service.sanitizeJson(nested, 5)).toThrow(BadRequestException);
    });

    it('should allow shallow JSON within depth limit', () => {
      const json = '{"level1": {"level2": {"level3": "value"}}}';
      const result = service.sanitizeJson(json, 5);

      expect(result.level1.level2.level3).toBe('value');
    });
  });

  describe('generateContentHash', () => {
    it('should generate SHA-256 hash', () => {
      const content = 'test content';
      const hash = service.generateContentHash(content);

      expect(hash).toContain('sha256-');
      expect(hash.length).toBeGreaterThan(20);
    });

    it('should generate same hash for same content', () => {
      const content = 'consistent content';
      const hash1 = service.generateContentHash(content);
      const hash2 = service.generateContentHash(content);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different content', () => {
      const hash1 = service.generateContentHash('content1');
      const hash2 = service.generateContentHash('content2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('validateLength', () => {
    it('should accept input within length limit', () => {
      expect(() => service.validateLength('short', 100)).not.toThrow();
      expect(() => service.validateLength('한글테스트', 10)).not.toThrow();
    });

    it('should reject input exceeding length limit', () => {
      const longInput = 'a'.repeat(101);
      expect(() => service.validateLength(longInput, 100)).toThrow(BadRequestException);
    });

    it('should use custom field name in error', () => {
      try {
        service.validateLength('x'.repeat(101), 100, '사용자명');
        fail('Should have thrown');
      } catch (error) {
        expect(error.message).toContain('사용자명');
      }
    });
  });

  describe('validateArraySize', () => {
    it('should accept array within size limit', () => {
      expect(() => service.validateArraySize([1, 2, 3], 10)).not.toThrow();
      expect(() => service.validateArraySize([], 5)).not.toThrow();
    });

    it('should reject array exceeding size limit', () => {
      const largeArray = Array(101).fill(0);
      expect(() => service.validateArraySize(largeArray, 100)).toThrow(BadRequestException);
    });

    it('should reject non-array input', () => {
      expect(() => service.validateArraySize('not-array' as any, 10)).toThrow(BadRequestException);
    });
  });
});
