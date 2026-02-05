export const SYSTEM_PROMPT = `당신은 AWS 스타트업 타이쿤 게임의 이벤트 생성 AI입니다.

게임 규칙:
- 자금(cash): ±50M~200M 범위의 변화
- 유저수(users): ±1000~5000 범위의 변화 (초기), ±5000~20000 (성장기)
- 신뢰도(trust): ±3~10 범위의 변화
- 인프라: EC2, Aurora, ALB, EKS, Redis, Aurora Global DB 중 추가/제거 가능

이벤트는 반드시:
1. 현재 게임 상황에 맞는 현실적인 시나리오
2. 2-3개의 선택지 제공 (trade-off 명확)
3. 각 선택지는 명확한 결과와 교훈 제공
4. JSON 형식으로 응답 (다른 텍스트 없이 순수 JSON만)

응답 형식:
{
  "eventType": "MARKET_OPPORTUNITY|COMPETITOR_ACTION|INFRASTRUCTURE_CRISIS|TEAM_EVENT|FUNDING_OPPORTUNITY",
  "title": "이벤트 제목 (20자 이내)",
  "description": "이벤트 상황 설명 (100-200자)",
  "choices": [
    {
      "text": "선택지 설명 (50-100자)",
      "effects": {
        "usersDelta": 숫자,
        "cashDelta": 숫자,
        "trustDelta": 숫자,
        "addInfrastructure": ["Aurora"] // optional
      },
      "resultText": "선택 결과 설명 (50-100자)"
    }
  ]
}`;

export const buildContextPrompt = (gameState: {
  currentTurn: number;
  cash: number;
  users: number;
  trust: number;
  infrastructure: string[];
}): string => {
  const stage = getGameStage(gameState);

  return `
현재 게임 상황:
- 턴: ${gameState.currentTurn}/25
- 자금: ${formatCash(gameState.cash)}
- 유저 수: ${formatUsers(gameState.users)}
- 신뢰도: ${gameState.trust}/100
- 인프라: ${gameState.infrastructure.join(', ')}
- 단계: ${stage}

위 상황에 맞는 이벤트를 생성하세요.`;
};

function getGameStage(gameState: any): string {
  if (gameState.currentTurn < 5) return '초기 스타트업';
  if (gameState.currentTurn < 10) return '성장기';
  if (gameState.currentTurn < 15) return '확장기';
  if (gameState.currentTurn < 20) return '스케일업';
  return 'IPO 준비';
}

function formatCash(cash: number): string {
  if (cash >= 1000000000) return `${(cash / 1000000000).toFixed(1)}B원`;
  if (cash >= 1000000) return `${(cash / 1000000).toFixed(0)}M원`;
  return `${(cash / 1000).toFixed(0)}K원`;
}

function formatUsers(users: number): string {
  if (users >= 1000000) return `${(users / 1000000).toFixed(1)}M명`;
  if (users >= 1000) return `${(users / 1000).toFixed(0)}K명`;
  return `${users}명`;
}
