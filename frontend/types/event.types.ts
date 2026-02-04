/**
 * Event System Type Definitions
 *
 * 동적 이벤트 시스템의 타입 정의
 * FEATURE-03-7: 이벤트 UI 통합
 */

/**
 * 이벤트 타입 (5가지)
 */
export type EventType = 'RANDOM' | 'CHAIN' | 'CRISIS' | 'OPPORTUNITY' | 'SEASONAL';

/**
 * 선택지 효과
 */
export interface EventChoiceEffects {
  users?: number;
  cash?: number;
  trust?: number;
  infra?: string[];
}

/**
 * 이벤트 선택지
 */
export interface EventChoice {
  choiceId: string;
  text: string;
  effects: EventChoiceEffects;
}

/**
 * 이벤트 데이터 (백엔드 응답)
 */
export interface EventData {
  eventId: string;
  eventType: EventType;
  eventText: string;
  choices: EventChoice[];
  title?: string; // 선택적 제목
}

/**
 * 이벤트 히스토리 엔트리
 */
export interface EventHistoryEntry {
  eventId: string;
  eventType: EventType;
  turnNumber: number;
  selectedChoiceId: string;
  timestamp: string;
}

/**
 * 게임 응답에 포함되는 이벤트 정보
 */
export interface GameEventResponse {
  randomEventTriggered?: boolean;
  randomEventData?: EventData;
}

/**
 * 이벤트 선택 실행 요청
 */
export interface ExecuteEventChoiceRequest {
  gameId: string;
  choiceId: string;
  eventId: string;
}

/**
 * 현재 게임 상태 (이벤트 컨텍스트용)
 */
export interface EventGameStats {
  users: number;
  trust: number;
  cash: number;
}
