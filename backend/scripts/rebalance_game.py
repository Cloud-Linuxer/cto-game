#!/usr/bin/env python3
"""
AWS CTO Game - Rebalancing Script
게임 밸런싱 자동 조정 스크립트
"""

import json
import copy
from typing import Dict, List

def load_game_data(filepath: str) -> List[Dict]:
    """게임 데이터 로드"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_game_data(filepath: str, data: List[Dict]):
    """게임 데이터 저장"""
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def add_investment_rounds(data: List[Dict]) -> List[Dict]:
    """투자 라운드 추가

    턴 6: 시리즈 A (5억 ~ 20억)
    턴 12: 시리즈 B (20억 ~ 100억)
    턴 18: 시리즈 C (100억 ~ 500억)
    """

    investment_rounds = {
        6: {
            "turn": 6,
            "event": "💼 턴 6 — 시리즈 A 투자 라운드\n\n현재 상황:\n- 자금: (선택에 따라 변동)\n- 유저: 500-7,000명\n- 인프라: EC2 AutoScaling, Aurora, EKS (선택에 따라)\n- 팀: CTO + 개발자 1-4명\n\n투자자들이 테이블에 앉았습니다. 실사(Due Diligence)가 시작되었고,\n기술 스택, 보안, 확장성에 대한 질문이 쏟아집니다.\n\n\"귀사의 인프라는 10만 유저를 감당할 수 있습니까?\"\n\"데이터 보안 인증은 어떻게 되어 있습니까?\"\n\"DevOps 파이프라인은 구축되어 있습니까?\"\n\n투자 성공을 위해 어떤 부분을 강화하시겠습니까?",
            "choices_to_add": [
                {
                    "id": "invest_6_conservative",
                    "text": "🏦 보수적 투자 유치 — 시리즈 A 최소 규모 (지분 15% 양도)\n\n📈 투자 유치: ₩500,000,000 (5억 원)\n💼 밸류에이션: ₩3,300,000,000 (33억 원)\n👥 투자자: 국내 초기 단계 VC\n\n안정적이지만 성장 속도는 제한적입니다.",
                    "effects": {
                        "users": 5000,
                        "cash": 500000000,
                        "trust": 10,
                        "infra": []
                    },
                    "next_turn": 7
                },
                {
                    "id": "invest_6_moderate",
                    "text": "💰 적정 규모 투자 유치 — 시리즈 A 평균 규모 (지분 20% 양도)\n\n📈 투자 유치: ₩1,000,000,000 (10억 원)\n💼 밸류에이션: ₩5,000,000,000 (50억 원)\n👥 투자자: 글로벌 VC 참여\n\n균형잡힌 선택으로 성장 가능성을 확보합니다.",
                    "effects": {
                        "users": 10000,
                        "cash": 1000000000,
                        "trust": 20,
                        "infra": []
                    },
                    "next_turn": 7
                },
                {
                    "id": "invest_6_aggressive",
                    "text": "🚀 공격적 투자 유치 — 시리즈 A 대규모 (지분 25% 양도)\n\n📈 투자 유치: ₩2,000,000,000 (20억 원)\n💼 밸류에이션: ₩8,000,000,000 (80억 원)\n👥 투자자: 유명 VC 리드 투자\n\n빠른 성장을 위한 자금을 확보하지만 지분을 많이 양도합니다.",
                    "effects": {
                        "users": 20000,
                        "cash": 2000000000,
                        "trust": 30,
                        "infra": []
                    },
                    "next_turn": 7
                }
            ]
        },
        12: {
            "turn": 12,
            "event": "🏢 턴 12 — 시리즈 B 투자 라운드\n\n현재 성과:\n- 유저: 10만+ 명 달성\n- 매출: 연 10-50억 원 규모\n- 인프라: 엔터프라이즈급 구성\n- 팀: 20-50명 규모\n\n시리즈 B 투자자들이 실적을 분석합니다.\nMAU, 리텐션, CAC, LTV 등 핵심 지표를 요구합니다.\n\n\"월간 활성 사용자 증가율은?\"\n\"고객 획득 비용 대비 생애 가치는?\"\n\"확장성 있는 비즈니스 모델입니까?\"\n\n본격적인 스케일업을 위한 투자 규모를 결정하세요.",
            "choices_to_add": [
                {
                    "id": "invest_12_conservative",
                    "text": "🏦 안정적 성장 전략 — 시리즈 B 최소 규모 (지분 12% 양도)\n\n📈 투자 유치: ₩2,000,000,000 (20억 원)\n💼 밸류에이션: ₩16,700,000,000 (167억 원)\n👥 투자자: 기존 투자자 팔로우온\n\n안정적 성장을 우선시합니다.",
                    "effects": {
                        "users": 30000,
                        "cash": 2000000000,
                        "trust": 15,
                        "infra": []
                    },
                    "next_turn": 13
                },
                {
                    "id": "invest_12_moderate",
                    "text": "💰 균형 성장 전략 — 시리즈 B 표준 규모 (지분 15% 양도)\n\n📈 투자 유치: ₩5,000,000,000 (50억 원)\n💼 밸류에이션: ₩33,300,000,000 (333억 원)\n👥 투자자: 유명 VC 신디케이트\n\n시장 확대와 조직 강화를 동시에 추진합니다.",
                    "effects": {
                        "users": 50000,
                        "cash": 5000000000,
                        "trust": 25,
                        "infra": []
                    },
                    "next_turn": 13
                },
                {
                    "id": "invest_12_aggressive",
                    "text": "🚀 시장 지배 전략 — 시리즈 B 대규모 (지분 20% 양도)\n\n📈 투자 유치: ₩10,000,000,000 (100억 원)\n💼 밸류에이션: ₩50,000,000,000 (500억 원)\n👥 투자자: 글로벌 메가 VC\n\n시장 1위를 위한 공격적 확장을 추진합니다.",
                    "effects": {
                        "users": 100000,
                        "cash": 10000000000,
                        "trust": 35,
                        "infra": []
                    },
                    "next_turn": 13
                }
            ]
        },
        18: {
            "turn": 18,
            "event": "🌟 턴 18 — 시리즈 C/Pre-IPO 투자 라운드\n\n현재 위치:\n- 유저: 50만+ 명 달성\n- 매출: 연 100-500억 원 규모\n- 시장 지위: 업계 Top 3\n- 팀: 100-300명 규모\n\nIPO를 준비하는 마지막 대형 투자 라운드입니다.\n기관 투자자와 전략적 투자자들이 관심을 보입니다.\n\n\"IPO 시 예상 밸류에이션은?\"\n\"글로벌 확장 계획은?\"\n\"유니콘 가능성은?\"\n\nIPO 성공을 위한 마지막 선택을 하세요.",
            "choices_to_add": [
                {
                    "id": "invest_18_conservative",
                    "text": "🏦 안정적 IPO 준비 — 시리즈 C 최소 규모 (지분 8% 양도)\n\n📈 투자 유치: ₩10,000,000,000 (100억 원)\n💼 밸류에이션: ₩125,000,000,000 (1,250억 원)\n👥 투자자: 안정적 기관 투자자\n\n확실한 수익성을 증명하며 IPO를 준비합니다.",
                    "effects": {
                        "users": 50000,
                        "cash": 10000000000,
                        "trust": 20,
                        "infra": []
                    },
                    "next_turn": 19
                },
                {
                    "id": "invest_18_moderate",
                    "text": "💰 표준 IPO 트랙 — 시리즈 C 표준 규모 (지분 10% 양도)\n\n📈 투자 유치: ₩30,000,000,000 (300억 원)\n💼 밸류에이션: ₩300,000,000,000 (3,000억 원)\n👥 투자자: 대형 PE 및 전략적 투자자\n\n글로벌 확장과 IPO를 동시에 준비합니다.",
                    "effects": {
                        "users": 100000,
                        "cash": 30000000000,
                        "trust": 30,
                        "infra": []
                    },
                    "next_turn": 19
                },
                {
                    "id": "invest_18_aggressive",
                    "text": "🚀 유니콘 도전 — Pre-IPO 대규모 (지분 12% 양도)\n\n📈 투자 유치: ₩50,000,000,000 (500억 원)\n💼 밸류에이션: ₩416,700,000,000 (4,167억 원)\n👥 투자자: 글로벌 메가 펀드\n\n유니콘 기업으로 상장을 목표로 합니다.",
                    "effects": {
                        "users": 200000,
                        "cash": 50000000000,
                        "trust": 40,
                        "infra": []
                    },
                    "next_turn": 19
                }
            ]
        }
    }

    new_data = copy.deepcopy(data)

    # 투자 라운드 턴 찾기 및 선택지 추가
    for turn_data in new_data:
        turn_num = turn_data['turn']
        if turn_num in investment_rounds:
            investment = investment_rounds[turn_num]

            # 기존 이벤트 텍스트 교체 (투자 라운드 스토리로)
            turn_data['event'] = investment['event']

            # 투자 선택지 추가 (기존 선택지 유지하면서)
            for inv_choice in investment['choices_to_add']:
                # ID 충돌 방지를 위해 높은 숫자 할당
                max_id = max([c['id'] for c in turn_data['choices']] + [0])
                inv_choice_copy = copy.deepcopy(inv_choice)
                inv_choice_copy['id'] = max_id + 1000  # 1000번대로 시작
                turn_data['choices'].append(inv_choice_copy)

    return new_data

def adjust_costs(data: List[Dict], reduction_factor: float = 0.5) -> List[Dict]:
    """비용 조정 (50% 감소)"""
    new_data = copy.deepcopy(data)

    for turn_data in new_data:
        turn_num = turn_data['turn']

        for choice in turn_data['choices']:
            effects = choice['effects']

            # 현금 효과 조정
            if effects.get('cash', 0) < 0:  # 비용인 경우만
                # 턴 11-20은 더 큰 폭으로 감소
                if 11 <= turn_num <= 20:
                    effects['cash'] = int(effects['cash'] * 0.3)  # 70% 감소
                else:
                    effects['cash'] = int(effects['cash'] * reduction_factor)

    return new_data

def normalize_user_effects(data: List[Dict]) -> List[Dict]:
    """유저 증가 효과 표준화"""
    new_data = copy.deepcopy(data)

    for turn_data in new_data:
        for choice in turn_data['choices']:
            effects = choice['effects']
            users = effects.get('users', 0)

            # 최대 제한
            if users > 150000:
                effects['users'] = 150000

            # 최소 제한 (마이너스 제거)
            if users < 0:
                effects['users'] = 0

    return new_data

def adjust_trust_growth(data: List[Dict]) -> List[Dict]:
    """신뢰도 증가 조정"""
    new_data = copy.deepcopy(data)

    for turn_data in new_data:
        for choice in turn_data['choices']:
            effects = choice['effects']
            trust = effects.get('trust', 0)

            # 신뢰도 증가를 40%로 감소
            if trust > 0:
                effects['trust'] = max(1, int(trust * 0.4))

    return new_data

def main():
    print("🎮 AWS CTO Game - Rebalancing Script")
    print("=" * 60)

    # 1. 원본 데이터 로드
    print("\n📂 Loading original game data...")
    data = load_game_data('../game_choices_db.json')
    print(f"   Loaded {len(data)} turns with {sum(len(t['choices']) for t in data)} choices")

    # 2. 백업 생성
    print("\n💾 Creating backup...")
    save_game_data('../game_choices_db_backup.json', data)
    print("   Backup saved to: game_choices_db_backup.json")

    # 3. 투자 라운드 추가
    print("\n💼 Adding investment rounds...")
    data = add_investment_rounds(data)
    print(f"   Added investment rounds at turns 6, 12, 18")
    print(f"   Total choices now: {sum(len(t['choices']) for t in data)}")

    # 4. 비용 조정
    print("\n💰 Adjusting costs...")
    data = adjust_costs(data, reduction_factor=0.5)
    print("   Reduced costs by 50% (70% for turns 11-20)")

    # 5. 유저 효과 표준화
    print("\n👥 Normalizing user effects...")
    data = normalize_user_effects(data)
    print("   Capped max users at 150,000, removed negative values")

    # 6. 신뢰도 조정
    print("\n📊 Adjusting trust growth...")
    data = adjust_trust_growth(data)
    print("   Reduced trust growth by 60%")

    # 7. 저장
    print("\n💾 Saving rebalanced data...")
    save_game_data('../game_choices_db_rebalanced.json', data)
    print("   Saved to: game_choices_db_rebalanced.json")

    print("\n✅ Rebalancing complete!")
    print("\nNext steps:")
    print("1. Review the changes in game_choices_db_rebalanced.json")
    print("2. Run balance analysis: python3 scripts/analyze_balance.py")
    print("3. If satisfied, replace: mv game_choices_db_rebalanced.json game_choices_db.json")
    print("4. Re-seed database: npm run seed")

if __name__ == '__main__':
    main()
