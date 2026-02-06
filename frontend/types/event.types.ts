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
 * 이벤트 심각도
 */
export type EventSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * 선택지 효과 (백엔드 응답 형식)
 * GameState.randomEventData에서 사용
 */
export interface BackendEventChoiceEffects {
  usersDelta?: number;
  cashDelta?: number;
  trustDelta?: number;
  addInfrastructure?: string[];
}

/**
 * 선택지 효과 (EventPopup 컴포넌트 형식)
 * EventPopup에서 사용
 */
export interface EventChoiceEffects {
  users?: number;
  cash?: number;
  trust?: number;
  infra?: string[];
}

/**
 * 백엔드 이벤트 선택지
 */
export interface BackendEventChoice {
  choiceId: string;
  text: string;
  effects: BackendEventChoiceEffects;
}

/**
 * 이벤트 선택지 (EventPopup용)
 */
export interface EventChoice {
  choiceId: string;
  text: string;
  effects: EventChoiceEffects;
}

/**
 * 백엔드 이벤트 데이터
 * GameState.randomEventData에서 사용
 */
export interface BackendEventData {
  eventId: string;
  eventType: string;
  eventText: string;
  choices: BackendEventChoice[];
  title?: string;
  severity?: string;
}

/**
 * 이벤트 데이터 (EventPopup 컴포넌트용)
 */
export interface EventData {
  eventId: string;
  eventType: EventType;
  eventText: string;
  choices: EventChoice[];
  title?: string;
  severity?: EventSeverity;
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
