#!/usr/bin/env python3
"""
AWS CTO Game - Balance Analysis Script
게임 밸런싱 분석 스크립트
"""

import json
import statistics
from typing import Dict, List, Tuple
from collections import defaultdict

def load_game_data(filepath: str) -> List[Dict]:
    """게임 데이터 로드"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def analyze_choice_effects(data: List[Dict]) -> Dict:
    """선택지 효과 분석"""
    all_users = []
    all_cash = []
    all_trust = []

    turn_stats = {}

    for turn_data in data:
        turn_num = turn_data['turn']
        choices = turn_data['choices']

        turn_users = []
        turn_cash = []
        turn_trust = []

        for choice in choices:
            effects = choice['effects']
            turn_users.append(effects.get('users', 0))
            turn_cash.append(effects.get('cash', 0))
            turn_trust.append(effects.get('trust', 0))

            all_users.append(effects.get('users', 0))
            all_cash.append(effects.get('cash', 0))
            all_trust.append(effects.get('trust', 0))

        turn_stats[turn_num] = {
            'users': {
                'min': min(turn_users),
                'max': max(turn_users),
                'avg': statistics.mean(turn_users),
                'median': statistics.median(turn_users)
            },
            'cash': {
                'min': min(turn_cash),
                'max': max(turn_cash),
                'avg': statistics.mean(turn_cash),
                'median': statistics.median(turn_cash)
            },
            'trust': {
                'min': min(turn_trust),
                'max': max(turn_trust),
                'avg': statistics.mean(turn_trust),
                'median': statistics.median(turn_trust)
            },
            'choice_count': len(choices)
        }

    return {
        'overall': {
            'users': {
                'min': min(all_users),
                'max': max(all_users),
                'avg': statistics.mean(all_users),
                'median': statistics.median(all_users),
                'stdev': statistics.stdev(all_users) if len(all_users) > 1 else 0
            },
            'cash': {
                'min': min(all_cash),
                'max': max(all_cash),
                'avg': statistics.mean(all_cash),
                'median': statistics.median(all_cash),
                'stdev': statistics.stdev(all_cash) if len(all_cash) > 1 else 0
            },
            'trust': {
                'min': min(all_trust),
                'max': max(all_trust),
                'avg': statistics.mean(all_trust),
                'median': statistics.median(all_trust),
                'stdev': statistics.stdev(all_trust) if len(all_trust) > 1 else 0
            }
        },
        'by_turn': turn_stats
    }

def simulate_path(data: List[Dict], strategy: str) -> Dict:
    """경로 시뮬레이션

    Args:
        strategy: 'best_users', 'worst_users', 'best_cash', 'worst_cash',
                  'best_trust', 'balanced'
    """
    initial_state = {
        'users': 0,
        'cash': 10_000_000,
        'trust': 50
    }

    current_state = initial_state.copy()
    history = [current_state.copy()]

    for turn_data in data:
        choices = turn_data['choices']

        if strategy == 'best_users':
            choice = max(choices, key=lambda c: c['effects'].get('users', 0))
        elif strategy == 'worst_users':
            choice = min(choices, key=lambda c: c['effects'].get('users', 0))
        elif strategy == 'best_cash':
            choice = max(choices, key=lambda c: c['effects'].get('cash', 0))
        elif strategy == 'worst_cash':
            choice = min(choices, key=lambda c: c['effects'].get('cash', 0))
        elif strategy == 'best_trust':
            choice = max(choices, key=lambda c: c['effects'].get('trust', 0))
        elif strategy == 'balanced':
            # 균형잡힌 선택: 각 지표를 정규화해서 합산
            def score(c):
                users_score = c['effects'].get('users', 0) / 20000  # 정규화
                cash_score = c['effects'].get('cash', 0) / 1000000  # 정규화
                trust_score = c['effects'].get('trust', 0) / 10  # 정규화
                return users_score + cash_score + trust_score
            choice = max(choices, key=score)
        else:
            choice = choices[0]  # 첫 번째 선택

        effects = choice['effects']
        current_state['users'] += effects.get('users', 0)
        current_state['cash'] += effects.get('cash', 0)
        current_state['trust'] += effects.get('trust', 0)

        # 신뢰도는 0-100 범위로 제한
        current_state['trust'] = max(0, min(100, current_state['trust']))

        history.append(current_state.copy())

    return {
        'strategy': strategy,
        'initial': initial_state,
        'final': current_state,
        'history': history
    }

def identify_balance_issues(stats: Dict, simulations: Dict) -> List[str]:
    """밸런싱 이슈 식별"""
    issues = []

    # 1. 유저 증가량 편차 확인
    users_stdev = stats['overall']['users']['stdev']
    users_avg = stats['overall']['users']['avg']
    if users_stdev > users_avg * 0.5:
        issues.append(f"⚠️ 유저 증가량 편차가 큽니다 (표준편차: {users_stdev:.0f}, 평균: {users_avg:.0f})")

    # 2. 현금 효과 편차 확인
    cash_stdev = stats['overall']['cash']['stdev']
    if cash_stdev > 2_000_000:
        issues.append(f"⚠️ 현금 효과 편차가 큽니다 (표준편차: {cash_stdev:,.0f}원)")

    # 3. 최적 vs 최악 경로 차이
    best = simulations['best_users']
    worst = simulations['worst_users']
    user_diff = best['final']['users'] - worst['final']['users']
    if user_diff > 500_000:
        issues.append(f"⚠️ 최적/최악 경로의 유저 수 차이가 큽니다 ({user_diff:,}명)")

    # 4. 현금 파산 가능성
    if worst['final']['cash'] < 0:
        issues.append(f"❌ 최악의 선택 시 파산 가능 (최종 현금: {worst['final']['cash']:,}원)")

    # 5. 신뢰도 범위
    trust_min = min([s['final']['trust'] for s in simulations.values()])
    trust_max = max([s['final']['trust'] for s in simulations.values()])
    if trust_max - trust_min > 80:
        issues.append(f"⚠️ 신뢰도 범위가 너무 넓습니다 ({trust_min}% ~ {trust_max}%)")

    return issues

def main():
    print("🎮 AWS CTO Game - Balance Analysis")
    print("=" * 60)

    # 데이터 로드
    data = load_game_data('../game_choices_db.json')
    total_turns = len(data)
    total_choices = sum(len(turn['choices']) for turn in data)

    print(f"\n📊 기본 정보:")
    print(f"  - 총 턴 수: {total_turns}")
    print(f"  - 총 선택지 수: {total_choices}")
    print(f"  - 턴당 평균 선택지: {total_choices / total_turns:.1f}")

    # 효과 분석
    print("\n📈 효과 분석:")
    stats = analyze_choice_effects(data)

    print("\n전체 통계:")
    for metric in ['users', 'cash', 'trust']:
        s = stats['overall'][metric]
        print(f"\n  {metric.upper()}:")
        print(f"    - 최소: {s['min']:,}")
        print(f"    - 최대: {s['max']:,}")
        print(f"    - 평균: {s['avg']:,.1f}")
        print(f"    - 중앙값: {s['median']:,.1f}")
        print(f"    - 표준편차: {s['stdev']:,.1f}")

    # 경로 시뮬레이션
    print("\n\n🎯 경로 시뮬레이션:")
    strategies = ['best_users', 'worst_users', 'best_cash', 'worst_cash', 'best_trust', 'balanced']
    simulations = {}

    for strategy in strategies:
        sim = simulate_path(data, strategy)
        simulations[strategy] = sim
        print(f"\n  {strategy}:")
        print(f"    - 최종 유저: {sim['final']['users']:,}명")
        print(f"    - 최종 현금: {sim['final']['cash']:,}원")
        print(f"    - 최종 신뢰도: {sim['final']['trust']}%")

    # 밸런싱 이슈
    print("\n\n⚖️ 밸런싱 이슈:")
    issues = identify_balance_issues(stats, simulations)
    if issues:
        for issue in issues:
            print(f"  {issue}")
    else:
        print("  ✅ 심각한 밸런싱 이슈가 발견되지 않았습니다.")

    # 턴별 난이도 곡선
    print("\n\n📉 턴별 효과 트렌드:")
    print("\n턴\t평균유저\t평균현금\t\t평균신뢰도")
    print("-" * 60)
    for turn_num in sorted(stats['by_turn'].keys()):
        turn_stat = stats['by_turn'][turn_num]
        print(f"{turn_num}\t{turn_stat['users']['avg']:,.0f}\t\t{turn_stat['cash']['avg']:,.0f}\t\t{turn_stat['trust']['avg']:.1f}")

    # 결과를 JSON으로 저장
    output = {
        'basic_info': {
            'total_turns': total_turns,
            'total_choices': total_choices,
            'avg_choices_per_turn': total_choices / total_turns
        },
        'statistics': stats,
        'simulations': {k: {
            'strategy': v['strategy'],
            'final': v['final']
        } for k, v in simulations.items()},
        'balance_issues': issues
    }

    with open('../balance_analysis.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print("\n\n✅ 분석 완료! 결과가 balance_analysis.json에 저장되었습니다.")

if __name__ == '__main__':
    main()
