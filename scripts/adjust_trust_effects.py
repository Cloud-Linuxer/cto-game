#!/usr/bin/env python3
"""
신뢰도 효과를 조정하는 스크립트
현재 +10~20 범위의 신뢰도 효과를 +1~3으로 낮춤
"""
import json
import sys

def adjust_trust_effects(data):
    """
    모든 선택지의 신뢰도 효과를 조정
    +10 이상 → +1~3으로 스케일링
    -10 이하 → -1~3으로 스케일링
    """
    for turn_data in data:
        for choice in turn_data.get('choices', []):
            effects = choice.get('effects', {})
            trust = effects.get('trust', 0)

            if trust > 0:
                # 긍정 효과: 10~20 → 1~3
                if trust >= 20:
                    effects['trust'] = 3
                elif trust >= 15:
                    effects['trust'] = 2
                elif trust >= 10:
                    effects['trust'] = 1
                elif trust >= 5:
                    effects['trust'] = 1
                # 5 미만은 그대로 유지
            elif trust < 0:
                # 부정 효과: -10 이하 → -1~3
                if trust <= -20:
                    effects['trust'] = -3
                elif trust <= -15:
                    effects['trust'] = -2
                elif trust <= -10:
                    effects['trust'] = -1
                elif trust <= -5:
                    effects['trust'] = -1
                # -5 초과는 그대로 유지

    return data

def main():
    input_file = '/home/cto-game/game_choices_db.json'
    output_file = '/home/cto-game/game_choices_db.json'

    print(f"📖 Reading {input_file}...")
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"🔧 Adjusting trust effects...")
    adjusted_data = adjust_trust_effects(data)

    # 통계 출력
    total_choices = sum(len(turn.get('choices', [])) for turn in adjusted_data)
    print(f"✅ Processed {len(adjusted_data)} turns, {total_choices} choices")

    print(f"💾 Writing to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(adjusted_data, f, ensure_ascii=False, indent=2)

    print("🎉 Done!")

if __name__ == '__main__':
    main()
