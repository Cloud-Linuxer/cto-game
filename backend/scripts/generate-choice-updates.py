#!/usr/bin/env python3
import json
import re

# 백업 파일 읽기
with open('backup/choices_backup_2025-10-02T07-09-42-427Z.json', 'r', encoding='utf-8') as f:
    choices = json.load(f)

# 카테고리별 설명 매핑
category_descriptions = {
    "marketing": ["입소문을 타고 빠르게 확산됩니다", "브랜드 인지도를 높입니다", "타겟 고객층에게 효과적으로 도달합니다"],
    "infra": ["안정적인 서비스 운영이 가능해집니다", "확장 가능한 인프라를 구축합니다", "기술적 우위를 확보합니다"],
    "feature": ["사용자 경험을 혁신적으로 개선합니다", "차별화된 가치를 제공합니다", "경쟁사와의 격차를 벌립니다"],
    "investment": ["성장을 위한 자금을 확보합니다", "전략적 파트너를 얻습니다", "다음 단계로 도약합니다"],
    "hr": ["팀 역량이 크게 강화됩니다", "전문성을 확보합니다", "조직 문화를 발전시킵니다"],
    "revenue": ["지속 가능한 수익 모델을 만듭니다", "재무 건전성을 확보합니다", "투자자들의 신뢰를 얻습니다"],
    "global": ["세계 시장으로 나아갑니다", "글로벌 경쟁력을 갖춥니다", "무한한 가능성을 열어갑니다"],
    "crisis": ["위기를 기회로 전환합니다", "더 강한 회사로 거듭납니다", "신뢰를 회복합니다"]
}

def extract_title(text):
    """선택지 텍스트에서 제목 추출"""
    lines = text.strip().split('\n')
    if lines:
        # 괄호 안의 금액 제거
        title = re.sub(r'\s*\([^)]*\)\s*$', '', lines[0])
        return title
    return "선택"

def get_emoji_for_category(category, title):
    """카테고리와 제목에 맞는 이모지 선택"""
    emoji_map = {
        "marketing": "📢",
        "infra": "🏗️",
        "feature": "✨",
        "investment": "💰",
        "hr": "👥",
        "revenue": "💎",
        "global": "🌍",
        "crisis": "🚨",
        "보안": "🛡️",
        "AI": "🤖",
        "데이터": "📊",
        "파트너": "🤝",
        "IPO": "🔔",
        "개발": "💻",
        "디자인": "🎨",
        "기획": "📋",
        "클라우드": "☁️",
        "자동화": "⚙️",
        "프리미엄": "💎",
        "글로벌": "🌐",
        "혁신": "💡"
    }

    # 제목에서 키워드 찾기
    for keyword, emoji in emoji_map.items():
        if keyword in title:
            return emoji

    # 카테고리별 기본 이모지
    if category in emoji_map:
        return emoji_map[category]

    return "🎯"

def generate_storytelling(choice):
    """선택지를 스토리텔링으로 변환"""
    original_text = choice.get('text', '')
    category = choice.get('category', 'general')
    choice_id = choice.get('choiceId')

    # 제목 추출
    title = extract_title(original_text)
    emoji = get_emoji_for_category(category, title)

    # 키워드 기반 카테고리 자동 매칭
    if not category or category == '':
        # 제목에서 카테고리 추론
        if "마케팅" in title or "캠페인" in title or "광고" in title or "홍보" in title or "프로모션" in title or "SNS" in title or "유저" in title:
            category = "marketing"
        elif "인프라" in title or "EC2" in title or "Aurora" in title or "CloudFront" in title or "CDN" in title or "Redis" in title or "RDS" in title or "S3" in title or "EKS" in title or "Lambda" in title or "서버" in title or "스케일" in title or "t4g" in title or "AWS" in title or "클라우드" in title or "DB" in title or "데이터베이스" in title or "네트워크" in title or "로드" in title or "백업" in title or "WAF" in title or "보안" in title:
            category = "infra"
        elif "기능" in title or "개발" in title or "리팩토링" in title or "API" in title or "UI" in title or "UX" in title or "모바일" in title or "앱" in title or "버전" in title or "업데이트" in title or "출시" in title or "런칭" in title or "프로필" in title or "알림" in title or "결제" in title or "로그인" in title or "소셜" in title or "실시간" in title:
            category = "feature"
        elif "투자" in title or "시리즈" in title or "VC" in title or "펀딩" in title or "자금" in title or "엔젤" in title or "억" in title:
            category = "investment"
        elif "채용" in title or "팀" in title or "인력" in title or "영입" in title or "조직" in title or "HR" in title or "인사" in title or "CTO" in title or "CFO" in title or "CMO" in title:
            category = "hr"
        elif "수익" in title or "매출" in title or "흑자" in title or "비즈니스" in title or "플랜" in title or "가격" in title or "구독" in title or "프리미엄" in title or "유료" in title or "결제" in title or "B2B" in title or "B2C" in title or "SI" in title or "컨설팅" in title:
            category = "revenue"
        elif "글로벌" in title or "해외" in title or "진출" in title or "현지" in title or "도쿄" in title or "싱가포르" in title or "미국" in title or "일본" in title or "중국" in title:
            category = "global"
        elif "위기" in title or "긴급" in title or "장애" in title or "복구" in title or "사고" in title or "해킹" in title or "DDoS" in title:
            category = "crisis"
        elif "계속" in title or "유지" in title or "현재" in title:
            category = "maintain"
        else:
            # 금액이나 숫자가 포함된 경우 revenue로 분류
            if "만원" in title or "천만" in title or "억원" in title:
                category = "revenue"
            else:
                category = "general"

    # 카테고리별 설명 선택
    descriptions = category_descriptions.get(category, [
        "새로운 기회를 창출합니다",
        "전략적 선택이 될 것입니다",
        "미래를 위한 투자입니다"
    ])

    # 특수 케이스 처리
    if "IPO" in title:
        return f"{emoji} {title}\\n\\n드디어 상장의 꿈을 실현합니다.\\n주식시장에 회사를 공개합니다.\\n새로운 성장 단계로 진입합니다."
    elif "긴급" in title or "비상" in title:
        return f"{emoji} {title}\\n\\n위기 상황에 즉각 대응합니다.\\n모든 역량을 집중하여 문제를 해결합니다.\\n신속하고 정확한 판단이 필요합니다."
    elif "계속하기" in title:
        return f"{emoji} {title}\\n\\n아직 준비가 더 필요합니다.\\n더 성장한 후 재도전합니다.\\n현재 전략을 유지합니다."
    elif "DR" in title or "재해복구" in title:
        return f"{emoji} {title}\\n\\n어떤 상황에도 서비스가 중단되지 않습니다.\\n완벽한 백업과 복구 체계를 갖춥니다.\\n고객의 절대적 신뢰를 얻습니다."
    elif "채용" in title or "영입" in title:
        role = ""
        if "개발" in title:
            role = "개발 역량을 크게 강화합니다.\\n더 빠른 기능 개발이 가능해집니다."
        elif "디자인" in title:
            role = "사용자 경험을 혁신적으로 개선합니다.\\n아름답고 직관적인 인터페이스를 만듭니다."
        elif "기획" in title:
            role = "체계적인 서비스 기획이 가능해집니다.\\n사용자 요구를 정확히 파악합니다."
        elif "마케" in title:
            role = "전문적인 마케팅 전략을 수립합니다.\\n효과적인 고객 획득이 가능해집니다."
        else:
            role = "최고의 인재들을 영입합니다.\\n조직 역량을 크게 강화합니다."
        return f"{emoji} {title}\\n\\n{role}\\n다음 단계 성장을 위한 팀을 구성합니다."

    # 일반적인 스토리텔링 생성
    story = f"{emoji} {title}\\n\\n"
    story += f"{descriptions[0]}\\n"
    story += f"{descriptions[1]}\\n"
    story += f"{descriptions[2]}"

    return story

# TypeScript 매핑 생성
updates = {}
for choice in choices:
    choice_id = choice.get('choiceId')
    new_text = generate_storytelling(choice)
    updates[choice_id] = new_text

# TypeScript 코드 생성
typescript_code = """import { DataSource } from 'typeorm';
import { Choice } from '../src/database/entities/choice.entity';

const dataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'cto_admin',
  password: 'cto_game_password',
  database: 'cto_game',
  entities: [Choice],
  synchronize: false,
});

const choiceTextUpdates: { [key: number]: string } = {
"""

# 선택지 업데이트 추가
for choice_id, text in sorted(updates.items()):
    typescript_code += f"  {choice_id}: '{text}',\n"

typescript_code = typescript_code.rstrip(',\n') + "\n};\n\n"

# 실행 코드 추가
typescript_code += """const updateChoiceTexts = async () => {
  await dataSource.initialize();

  let updatedCount = 0;
  let skippedCount = 0;

  for (const [choiceId, newText] of Object.entries(choiceTextUpdates)) {
    try {
      const result = await dataSource
        .createQueryBuilder()
        .update(Choice)
        .set({ text: newText })
        .where('choiceId = :choiceId', { choiceId: parseInt(choiceId) })
        .execute();

      if (result.affected && result.affected > 0) {
        console.log(`✅ Updated choice ${choiceId}`);
        updatedCount++;
      } else {
        console.log(`⏭️  Skipped choice ${choiceId} (not found)`);
        skippedCount++;
      }
    } catch (error) {
      console.error(`❌ Error updating choice ${choiceId}:`, error);
    }
  }

  console.log('\\n📊 Update Summary:');
  console.log(`✅ Updated: ${updatedCount} choices`);
  console.log(`⏭️  Skipped: ${skippedCount} choices`);
  console.log(`📝 Total processed: ${Object.keys(choiceTextUpdates).length} choices`);

  await dataSource.destroy();
};

updateChoiceTexts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error updating choice texts:', error);
    process.exit(1);
  });"""

# 파일로 저장
with open('scripts/update-all-choice-texts.ts', 'w', encoding='utf-8') as f:
    f.write(typescript_code)

print(f"✅ Generated update script for {len(updates)} choices")
print("📝 Saved to scripts/update-all-choice-texts.ts")