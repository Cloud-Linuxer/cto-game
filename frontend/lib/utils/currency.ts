/**
 * 통일된 비용 표시 유틸리티
 * EPIC-11: 프론트엔드 UI/UX 개선 - Feature 2
 */

/**
 * 금액을 일관된 포맷으로 표시
 * @param amount - 금액 (원)
 * @param format - 'compact' | 'full' | 'both'
 * @returns 포맷된 문자열
 */
export function formatCurrency(
  amount: number,
  format: 'compact' | 'full' | 'both' = 'compact'
): { primary: string; secondary?: string } {
  const manwon = Math.floor(amount / 10000);
  const fullAmount = new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(amount);

  if (format === 'compact') {
    return { primary: `${manwon.toLocaleString()}만원` };
  } else if (format === 'full') {
    return { primary: fullAmount };
  } else {
    // both
    return {
      primary: `${manwon.toLocaleString()}만원`,
      secondary: fullAmount
    };
  }
}

/**
 * 변화량 표시 (+ 또는 - 포함)
 */
export function formatCurrencyChange(
  amount: number,
  format: 'compact' | 'full' | 'both' = 'compact'
): { primary: string; secondary?: string } {
  const sign = amount >= 0 ? '+' : '';
  const formatted = formatCurrency(Math.abs(amount), format);

  return {
    primary: `${sign}${formatted.primary}`,
    secondary: formatted.secondary ? `${sign}${formatted.secondary}` : undefined
  };
}
