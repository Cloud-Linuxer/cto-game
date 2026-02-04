/**
 * EventPopup Usage Examples
 *
 * 이벤트 팝업 시스템 사용 예시
 */

import React, { useState } from 'react';
import { EventPopup } from '@/components/EventPopup';
import type { EventData } from '@/types/event.types';

/**
 * Example 1: 기본 사용 (단순 API 호출)
 */
export function BasicEventPopupExample() {
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gameId = 'example-game-id';

  const handleSelectChoice = async (choiceId: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(`/api/game/${gameId}/event-choice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          choiceId,
          eventId: eventData?.eventId,
        }),
      });

      if (!response.ok) {
        throw new Error('API 호출 실패');
      }

      const data = await response.json();
      console.log('게임 상태 업데이트:', data);

      // 팝업 닫기
      setEventData(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setIsProcessing(false);
    }
  };

  // 예시 이벤트 데이터
  const exampleEvent: EventData = {
    eventId: 'crisis-001',
    eventType: 'CRISIS',
    eventText: 'AWS ap-northeast-2 리전에 장애가 발생했습니다!\n\n서울 리전 전체가 다운되어 현재 120,000명의 유저가 서비스를 이용할 수 없습니다.',
    title: '리전 장애 발생',
    choices: [
      {
        choiceId: 'crisis-001-a',
        text: '멀티 리전 긴급 구축',
        effects: {
          cash: -50000000,
          trust: 15,
          infra: ['Multi-Region'],
        },
      },
      {
        choiceId: 'crisis-001-b',
        text: '복구 대기',
        effects: {
          users: -30000,
          trust: -40,
        },
      },
    ],
  };

  return (
    <div>
      {/* 트리거 버튼 (테스트용) */}
      <button
        onClick={() => setEventData(exampleEvent)}
        className="px-4 py-2 bg-red-500 text-white rounded-lg"
      >
        CRISIS 이벤트 발생 시뮬레이션
      </button>

      {/* 이벤트 팝업 */}
      {eventData && (
        <EventPopup
          eventData={eventData}
          gameId={gameId}
          onSelectChoice={handleSelectChoice}
          onComplete={() => setEventData(null)}
          isProcessing={isProcessing}
          error={error}
        />
      )}
    </div>
  );
}

/**
 * Example 2: Redux와 함께 사용
 */
/*
import { useSelector, useDispatch } from 'react-redux';
import {
  selectCurrentEvent,
  selectIsPopupOpen,
  selectIsProcessing,
  selectError,
  closeEventPopup,
  setProcessing,
  setError,
} from '@/store/slices/eventSlice';

export function ReduxEventPopupExample() {
  const dispatch = useDispatch();
  const currentEvent = useSelector(selectCurrentEvent);
  const isPopupOpen = useSelector(selectIsPopupOpen);
  const isProcessing = useSelector(selectIsProcessing);
  const error = useSelector(selectError);
  const gameId = 'example-game-id';

  const handleSelectChoice = async (choiceId: string) => {
    if (!currentEvent) return;

    dispatch(setProcessing(true));

    try {
      const response = await fetch(`/api/game/${gameId}/event-choice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          choiceId,
          eventId: currentEvent.eventId,
        }),
      });

      if (!response.ok) {
        throw new Error('API 호출 실패');
      }

      const data = await response.json();

      // 성공 시 팝업 닫기
      dispatch(closeEventPopup());

    } catch (err) {
      dispatch(setError(err instanceof Error ? err.message : '알 수 없는 오류'));
    }
  };

  const handleComplete = () => {
    dispatch(closeEventPopup());
  };

  return (
    <>
      {isPopupOpen && currentEvent && (
        <EventPopup
          eventData={currentEvent}
          gameId={gameId}
          onSelectChoice={handleSelectChoice}
          onComplete={handleComplete}
          isProcessing={isProcessing}
          error={error}
        />
      )}
    </>
  );
}
*/

/**
 * Example 3: 게임 턴 진행 시 이벤트 트리거
 */
export function GameTurnWithEventExample() {
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const gameId = 'example-game-id';

  // 일반 선택지 실행
  const handleNormalChoice = async (choiceId: number) => {
    setIsProcessing(true);

    try {
      const response = await fetch(`/api/game/${gameId}/choice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choiceId }),
      });

      const data = await response.json();

      // 이벤트 발생 확인
      if (data.randomEventTriggered && data.randomEventData) {
        setEventData(data.randomEventData);
      } else {
        // 정상 턴 진행
        console.log('게임 상태 업데이트:', data);
      }
    } catch (err) {
      console.error('턴 진행 실패:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // 이벤트 선택지 실행
  const handleEventChoice = async (choiceId: string) => {
    setIsProcessing(true);

    try {
      const response = await fetch(`/api/game/${gameId}/event-choice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          choiceId,
          eventId: eventData?.eventId,
        }),
      });

      const data = await response.json();
      console.log('이벤트 처리 완료:', data);

      // 팝업 닫기
      setEventData(null);
    } catch (err) {
      console.error('이벤트 처리 실패:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      {/* 일반 게임 화면 */}
      <div className="p-4">
        <button
          onClick={() => handleNormalChoice(1)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg"
        >
          일반 선택지 실행 (이벤트 발생 가능)
        </button>
      </div>

      {/* 이벤트 팝업 */}
      {eventData && (
        <EventPopup
          eventData={eventData}
          gameId={gameId}
          onSelectChoice={handleEventChoice}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
}

/**
 * Example 4: 모든 이벤트 타입 시연
 */
export function AllEventTypesExample() {
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const gameId = 'example-game-id';

  const exampleEvents: EventData[] = [
    {
      eventId: 'random-001',
      eventType: 'RANDOM',
      eventText: '우연히 대형 미디어에 소개되었습니다!',
      title: '언론 보도',
      choices: [
        {
          choiceId: 'random-001-a',
          text: '적극 홍보',
          effects: { users: 10000, cash: -5000000 },
        },
        {
          choiceId: 'random-001-b',
          text: '현상 유지',
          effects: { users: 5000 },
        },
      ],
    },
    {
      eventId: 'chain-001',
      eventType: 'CHAIN',
      eventText: '이전 투자가 성과를 내고 있습니다.',
      title: '투자 성과',
      choices: [
        {
          choiceId: 'chain-001-a',
          text: '추가 투자',
          effects: { cash: -20000000, trust: 10 },
        },
      ],
    },
    {
      eventId: 'crisis-001',
      eventType: 'CRISIS',
      eventText: 'AWS 리전 장애 발생!',
      title: '긴급 상황',
      choices: [
        {
          choiceId: 'crisis-001-a',
          text: '멀티 리전 구축',
          effects: { cash: -50000000, trust: 15, infra: ['Multi-Region'] },
        },
        {
          choiceId: 'crisis-001-b',
          text: '복구 대기',
          effects: { users: -30000, trust: -40 },
        },
      ],
    },
    {
      eventId: 'opportunity-001',
      eventType: 'OPPORTUNITY',
      eventText: '대형 투자자가 관심을 보이고 있습니다!',
      title: '투자 기회',
      choices: [
        {
          choiceId: 'opportunity-001-a',
          text: '투자 유치',
          effects: { cash: 100000000, trust: 20 },
        },
        {
          choiceId: 'opportunity-001-b',
          text: '거절',
          effects: { trust: 5 },
        },
      ],
    },
    {
      eventId: 'seasonal-001',
      eventType: 'SEASONAL',
      eventText: '연말 특별 할인 시즌입니다.',
      title: '시즌 이벤트',
      choices: [
        {
          choiceId: 'seasonal-001-a',
          text: '대규모 할인',
          effects: { users: 50000, cash: -30000000 },
        },
        {
          choiceId: 'seasonal-001-b',
          text: '정상 운영',
          effects: { users: 10000 },
        },
      ],
    },
  ];

  const handleSelectChoice = async (choiceId: string) => {
    console.log('선택된 선택지:', choiceId);
    // 실제 API 호출 로직...
    await new Promise(resolve => setTimeout(resolve, 1000)); // 시뮬레이션
    setSelectedEvent(null);
  };

  return (
    <div className="p-4 space-y-2">
      <h2 className="text-2xl font-bold mb-4">이벤트 타입별 시연</h2>

      {exampleEvents.map((event) => (
        <button
          key={event.eventId}
          onClick={() => setSelectedEvent(event)}
          className="block w-full px-4 py-2 text-left bg-slate-100 hover:bg-slate-200 rounded-lg"
        >
          {event.eventType}: {event.title}
        </button>
      ))}

      {selectedEvent && (
        <EventPopup
          eventData={selectedEvent}
          gameId={gameId}
          onSelectChoice={handleSelectChoice}
          onComplete={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
