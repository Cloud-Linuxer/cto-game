#!/usr/bin/env python3
"""
기술적 선택지에 신뢰도 +2 보너스 추가
인프라 카테고리 또는 특정 기술 키워드가 포함된 선택지를 대상으로 함
"""
import json
import sys

# 기술 관련 키워드
TECH_KEYWORDS = [
    'RDS', 'Aurora', 'ECS', 'EKS', 'CloudFront', 'Lambda', 'WAF',
    'Auto Scaling', 'Redis', 'CloudWatch', 'CodePipeline', 'S3',
    'CDN', 'Bedrock', 'X-Ray', 'Shield', 'DevOps', 'CI/CD',
    '컨테이너', '모니터링', '인프라', '보안', '암호화', '데이터베이스'
]

def is_tech_choice(choice):
    """선택지가 기술적 선택인지 판단"""
    # 카테고리가 "인프라"인 경우
    if choice.get('category') == '인프라':
        return True

    # 텍스트에 기술 키워드가 포함된 경우
    text = choice.get('text', '')
    for keyword in TECH_KEYWORDS:
        if keyword in text:
            return True

    return False

def boost_tech_choices(data):
    """기술적 선택지에 신뢰도 +2 추가"""
    boosted_count = 0

    for turn_data in data:
        for choice in turn_data.get('choices', []):
            if is_tech_choice(choice):
                effects = choice.get('effects', {})
                current_trust = effects.get('trust', 0)
                effects['trust'] = current_trust + 2
                boosted_count += 1
                print(f"  ✅ Choice {choice['id']}: trust {current_trust} → {effects['trust']}")

    return data, boosted_count

def main():
    input_file = '/home/cto-game/game_choices_db.json'
    output_file = '/home/cto-game/game_choices_db.json'

    print(f"📖 Reading {input_file}...")
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"🔧 Boosting tech choices...")
    adjusted_data, boosted_count = boost_tech_choices(data)

    print(f"\n✅ Boosted {boosted_count} tech choices")

    print(f"💾 Writing to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(adjusted_data, f, ensure_ascii=False, indent=2)

    print("🎉 Done!")

if __name__ == '__main__':
    main()
