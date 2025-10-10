import { DataSource } from 'typeorm';
import { Turn } from '../src/database/entities/turn.entity';

const dataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'cto_admin',
  password: 'cto_game_password',
  database: 'cto_game',
  entities: [Turn],
  synchronize: false,
});

const updateEventTexts = async () => {
  await dataSource.initialize();

  const updates = [
    // Turn 1-25
    { turnNumber: 1, eventText: '🚀 AWS 스타트업 타이쿤 — 새로운 시작\n\n드디어 당신은 스타트업을 창업했습니다.\n작은 사무실, EC2 인스턴스 하나, 그리고 원대한 꿈.\n"Hello World" 페이지가 떠있는 화면을 바라보며, 당신은 첫 걸음을 내딛습니다.\n\n이제 무엇부터 시작할까요?' },
    { turnNumber: 2, eventText: '📊 첫 번째 도전\n\n초기 전략을 실행한 후, 당신은 깨닫습니다.\n스타트업의 길은 매 순간이 선택의 연속이라는 것을.\n시장은 빠르게 변하고, 경쟁자들도 나타나기 시작했습니다.\n\n다음 행보를 신중히 결정해야 합니다.' },
    { turnNumber: 3, eventText: '🎯 시장 반응\n\n서비스가 조금씩 알려지기 시작합니다.\n소셜 미디어에서 당신의 제품을 언급하는 사람들이 생겼고,\n첫 피드백들이 들어오기 시작합니다.\n\n이제 성장의 기로에 서 있습니다.' },
    { turnNumber: 4, eventText: '💡 성장의 갈림길\n\n투자자들이 당신의 스타트업에 관심을 보이기 시작합니다.\n하지만 그들은 명확한 성장 전략과 수익 모델을 요구합니다.\n인프라는 점점 한계를 드러내고 있습니다.\n\n균형 잡힌 성장이 필요한 시점입니다.' },
    { turnNumber: 5, eventText: '🚀 시리즈 A의 기회\n\n벤처캐피탈들이 미팅을 요청합니다.\n"유니콘이 될 잠재력이 있다"는 평가를 받았지만,\n그들은 공격적인 성장을 요구합니다.\n\n투자를 받을 것인가, 자체 성장을 추구할 것인가?' },
    { turnNumber: 6, eventText: '⚡ 스케일업 압박\n\n서비스가 입소문을 타며 급성장하기 시작합니다.\n서버가 간헐적으로 느려지고, 고객 불만이 늘어납니다.\n팀원들은 밤낮없이 일하고 있습니다.\n\n안정성과 성장, 무엇을 우선할 것인가요?' },
    { turnNumber: 7, eventText: '🔥 첫 번째 위기\n\n경쟁사가 비슷한 서비스를 출시했습니다.\n그들은 대기업의 지원을 받고 있으며, 공격적인 마케팅을 펼치고 있습니다.\n당신의 차별화 전략이 시험대에 올랐습니다.\n\n어떻게 대응할 것인가요?' },
    { turnNumber: 8, eventText: '📈 지수적 성장\n\n바이럴 마케팅이 성공했습니다!\n유명 인플루언서가 당신의 서비스를 추천하며 트래픽이 폭발적으로 증가합니다.\n하지만 서버는 이미 한계에 도달했습니다.\n\n기회를 놓칠 것인가, 위험을 감수할 것인가?' },
    { turnNumber: 9, eventText: '💰 수익화의 압박\n\n투자자들이 수익 모델 실행을 압박합니다.\n"성장은 좋지만, 언제 수익을 낼 것인가?"\n무료 사용자들의 반발도 우려됩니다.\n\n수익과 성장 사이의 균형점을 찾아야 합니다.' },
    { turnNumber: 10, eventText: '🏢 기업 문화의 도전\n\n팀이 성장하면서 문화 충돌이 일어나기 시작합니다.\n초기 멤버와 새로운 멤버 간의 갈등, 번아웃 증상들...\n"우리가 왜 시작했는지" 되묻는 목소리들이 들립니다.\n\n조직을 어떻게 이끌어갈 것인가요?' },
    { turnNumber: 11, eventText: '🌏 글로벌 진출 기회\n\n해외에서 러브콜이 왔습니다.\n일본의 대형 IT 기업이 파트너십을 제안합니다.\n하지만 현지화와 규제 준수는 큰 도전입니다.\n\n국내 집중인가, 글로벌 확장인가?' },
    { turnNumber: 12, eventText: '🛡️ 보안 사고 위협\n\n해커들의 공격 시도가 감지되었습니다.\n고객 데이터는 아직 안전하지만, 언론이 냄새를 맡기 시작했습니다.\n보안 투자는 비용이 많이 들지만 필수적입니다.\n\n신뢰를 지킬 것인가, 성장에 집중할 것인가?' },
    { turnNumber: 13, eventText: '📱 플랫폼 전쟁\n\n거대 플랫폼들이 유사 서비스를 무료로 제공하기 시작했습니다.\n"우리가 살아남을 수 있을까?"라는 의구심이 팀 내에 퍼집니다.\n하지만 충성 고객층은 여전히 당신을 지지합니다.\n\n어떤 전략으로 맞설 것인가요?' },
    { turnNumber: 14, eventText: '💎 유니콘의 가능성\n\n실리콘밸리의 유명 VC가 관심을 보입니다.\n"10억 달러 가치 평가"라는 말이 들립니다.\n하지만 그들은 회사의 방향성에 깊이 개입하려 합니다.\n\n독립성과 성장, 무엇을 선택할 것인가요?' },
    { turnNumber: 15, eventText: '🔄 피벗의 기로\n\n데이터가 말해줍니다. 현재 방향이 옳지 않다고.\n일부 임원진은 과감한 피벗을 주장합니다.\n하지만 기존 고객들을 잃을 위험이 있습니다.\n\n변화할 것인가, 고수할 것인가?' },
    { turnNumber: 16, eventText: '⚖️ 규제의 벽\n\n정부가 새로운 규제를 발표했습니다.\n당신의 서비스 모델에 직접적인 영향을 미칩니다.\n로비스트들은 비싼 비용을 요구합니다.\n\n어떻게 대응할 것인가요?' },
    { turnNumber: 17, eventText: '🎭 언론의 양면성\n\n주요 언론사가 당신의 스타트업을 조명합니다.\n"혁신의 아이콘"과 "거품 논란" 사이에서 평가가 갈립니다.\n주가와 기업 가치에 직접적인 영향을 미치고 있습니다.\n\n어떤 이미지를 구축할 것인가요?' },
    { turnNumber: 18, eventText: '🤝 인수합병 제안\n\n경쟁사가 인수 제안을 해왔습니다.\n창업자들 사이에서 의견이 갈립니다.\n"이제 그만 쉬고 싶다"는 목소리와 "아직 갈 길이 멀다"는 목소리.\n\n회사의 운명을 결정해야 합니다.' },
    { turnNumber: 19, eventText: '🌟 정점을 향해\n\n모든 지표가 상승세를 보입니다.\n업계는 당신의 다음 행보를 주목하고 있습니다.\n"Next Big Thing"이 될 수 있는 절호의 기회입니다.\n\n마지막 스퍼트를 어떻게 준비할 것인가요?' },
    { turnNumber: 20, eventText: '🏆 IPO 준비\n\n투자은행들이 IPO를 제안합니다.\n"시장 상황이 완벽합니다"라고 그들은 말합니다.\n하지만 상장 후의 압박도 만만치 않을 것입니다.\n\n공개 기업이 될 준비가 되었나요?' },
    { turnNumber: 21, eventText: '⏰ 마지막 스프린트\n\nIPO 심사가 시작되었습니다.\n규제 기관의 까다로운 요구사항들이 쏟아집니다.\n모든 것이 투명해져야 하고, 실수는 용납되지 않습니다.\n\n최종 점검을 어떻게 할 것인가요?' },
    { turnNumber: 22, eventText: '🎲 운명의 갈림길\n\n시장이 요동치고 있습니다.\n글로벌 경제 불확실성이 높아지는 가운데,\n당신의 IPO 성공 여부에 모든 이목이 집중됩니다.\n\n어떤 선택이 회사를 구할 것인가요?' },
    { turnNumber: 23, eventText: '🚨 최후의 도전\n\n예상치 못한 위기가 발생했습니다.\n주요 고객사가 이탈하려 하고, 핵심 인재들이 흔들립니다.\nIPO를 코앞에 두고 모든 것이 무너질 위기입니다.\n\n어떻게 위기를 돌파할 것인가요?' },
    { turnNumber: 24, eventText: '⚡ 결전의 시간\n\n내일이 IPO 데드라인입니다.\n이사회는 최종 결정을 기다리고 있습니다.\n지금까지의 모든 선택이 이 순간으로 수렴됩니다.\n\n마지막 전략을 선택하세요.' },
    { turnNumber: 25, eventText: '🎯 운명의 날\n\nD-Day가 밝았습니다.\n증권거래소 종이 울릴 시간입니다.\n당신의 선택이 회사의 미래를 결정짓습니다.\n\nIPO 조건을 충족했나요?' },
    // Emergency event turns
    { turnNumber: 888, eventText: '🚨 긴급 상황 발생!\n\nAWS 대규모 장애가 발생했습니다!\n전 세계 서비스들이 마비되는 가운데,\n당신의 대응이 회사의 생존을 좌우할 것입니다.\n\n신속한 결정이 필요합니다!' },
    { turnNumber: 889, eventText: '💥 위기의 정점\n\n장애가 확산되고 있습니다.\n고객들의 분노가 폭발하고 있으며,\n언론은 "스타트업 무책임론"을 퍼뜨리고 있습니다.\n\n어떻게 신뢰를 회복할 것인가요?' },
    { turnNumber: 890, eventText: '🔧 복구와 재건\n\n장애가 해결되기 시작했습니다.\n하지만 상처는 깊게 남았습니다.\n이제 신뢰를 회복하고 더 강해져야 합니다.\n\n재도약의 전략을 선택하세요.' },
    // IPO selection turn
    { turnNumber: 950, eventText: '🎊 IPO 성공!\n\n축하합니다! 모든 조건을 충족했습니다.\n증권거래소에 당신의 회사 이름이 올라갑니다.\n이제 새로운 장이 시작됩니다.\n\nIPO를 진행하시겠습니까?' }
  ];

  for (const update of updates) {
    await dataSource
      .createQueryBuilder()
      .update(Turn)
      .set({ eventText: update.eventText })
      .where('turnNumber = :turnNumber', { turnNumber: update.turnNumber })
      .execute();

    console.log(`Updated turn ${update.turnNumber}`);
  }

  console.log('All event texts updated successfully!');
  await dataSource.destroy();
};

updateEventTexts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error updating event texts:', error);
    process.exit(1);
  });