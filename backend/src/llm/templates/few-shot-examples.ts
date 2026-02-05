export const FEW_SHOT_EXAMPLES = [
  {
    context: '턴: 3, 자금: 10M, 유저: 100, 신뢰도: 50, 인프라: EC2',
    event: {
      eventType: 'MARKET_OPPORTUNITY',
      title: '유명 인플루언서 협업 제안',
      description: '팔로워 50만 명의 테크 인플루언서가 무료로 서비스를 홍보하겠다고 제안했습니다. 단, 프리미엄 기능을 1개월간 무료로 제공해야 합니다.',
      choices: [
        {
          text: '협업 진행 - 단기 매출 감소하지만 유저 폭증 기대',
          effects: {
            usersDelta: 3000,
            cashDelta: -20000000,
            trustDelta: 5,
          },
          resultText: '인플루언서 효과로 3000명의 신규 유저 유입! 프리미엄 무료 제공으로 2000만원 손실',
        },
        {
          text: '정중히 거절 - 안정적 성장 유지',
          effects: {
            usersDelta: 200,
            cashDelta: 5000000,
            trustDelta: -2,
          },
          resultText: '기회를 놓쳤다는 아쉬움이 남지만, 안정적인 매출 유지',
        },
      ],
    },
  },
  {
    context: '턴: 8, 자금: 150M, 유저: 5000, 신뢰도: 60, 인프라: EC2, Aurora',
    event: {
      eventType: 'INFRASTRUCTURE_CRISIS',
      title: '갑작스런 트래픽 폭증',
      description: '유명 커뮤니티에 서비스가 소개되며 트래픽이 10배 증가했습니다. 현재 EC2 인스턴스가 CPU 90%를 기록 중입니다.',
      choices: [
        {
          text: '긴급 ALB + AutoScaling 구축 - 비용 많이 들지만 안정적',
          effects: {
            usersDelta: 8000,
            cashDelta: -80000000,
            trustDelta: 8,
            addInfrastructure: ['ALB', 'AutoScaling'],
          },
          resultText: 'AutoScaling으로 안정적으로 트래픽 처리! 8000명 신규 유저 확보',
        },
        {
          text: 'EC2 인스턴스 타입만 업그레이드 - 저렴하지만 위험',
          effects: {
            usersDelta: 4000,
            cashDelta: -30000000,
            trustDelta: -5,
          },
          resultText: '일부 유저는 느린 응답 속도에 이탈했지만, 비용 절감 성공',
        },
        {
          text: '아무것도 안 함 - 비용 0원이지만 서비스 불안정',
          effects: {
            usersDelta: -1000,
            cashDelta: 0,
            trustDelta: -10,
          },
          resultText: '서버 다운으로 1000명 이탈! 신뢰도 큰 폭 하락',
        },
      ],
    },
  },
  {
    context: '턴: 15, 자금: 500M, 유저: 100000, 신뢰도: 75, 인프라: EC2, Aurora, ALB, EKS',
    event: {
      eventType: 'FUNDING_OPPORTUNITY',
      title: '글로벌 VC 투자 제안',
      description: '실리콘밸리의 유명 VC가 200억 원 투자를 제안했습니다. 대신 글로벌 진출과 EKS 기반 MSA 전환을 요구합니다.',
      choices: [
        {
          text: '투자 받고 글로벌 진출 - Aurora Global DB 구축',
          effects: {
            usersDelta: 50000,
            cashDelta: 20000000000,
            trustDelta: 15,
            addInfrastructure: ['Aurora Global DB'],
          },
          resultText: '200억 투자 유치! Aurora Global DB로 아시아 전역 서비스 시작',
        },
        {
          text: '투자 거절하고 국내 시장 집중',
          effects: {
            usersDelta: 10000,
            cashDelta: 50000000,
            trustDelta: -5,
          },
          resultText: '안정적이지만 성장 속도가 느려짐. 경쟁사에 뒤처질 위험',
        },
      ],
    },
  },
];

export const getFewShotPrompt = (): string => {
  return `
좋은 이벤트 예시:

${FEW_SHOT_EXAMPLES.map((example, idx) => `
예시 ${idx + 1}:
${example.context}

생성된 이벤트:
${JSON.stringify(example.event, null, 2)}
`).join('\n---\n')}

이제 주어진 게임 상황에 맞는 새로운 이벤트를 생성하세요.
`;
};
