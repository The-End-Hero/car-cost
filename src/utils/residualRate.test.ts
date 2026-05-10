import { describe, expect, it } from "vitest";
import { add, divide, max, multiply, subtract } from "mathjs";

/**
 * 最低残值率（约等于报废价格）
 * 新能源车约 2-3%，燃油车约 1-2%，取 3% 作为最低值
 */
const MIN_RESIDUAL_RATE = 0.03;

/**
 * 8 年后每年残值衰减率
 */
const POST_8_DECAY_RATE = 0.015;

/**
 * 根据 3/5/8 年折旧率做分段线性插值，得到指定年份末的车辆残值率（0~1）
 */
function interpolateResidualRate(
  year: number,
  depreciationRate3: number,
  depreciationRate5: number,
  depreciationRate8: number
): number {
  const r0 = 0.95;
  const r3 = max(0, subtract(1, depreciationRate3) as number) as number;
  const r5 = max(0, subtract(1, depreciationRate5) as number) as number;
  const r8 = max(0, subtract(1, depreciationRate8) as number) as number;
  if (year <= 0) return r0;
  if (year <= 3) {
    return add(r0, multiply(divide(subtract(r3, r0), 3), year)) as number;
  }
  if (year <= 5) {
    return add(r3, multiply(divide(subtract(r5, r3), 2), subtract(year, 3) as number)) as number;
  }
  if (year <= 8) {
    return add(r5, multiply(divide(subtract(r8, r5), 3), subtract(year, 5) as number)) as number;
  }
  // 8 年后继续衰减，最低不低于报废价格
  const yearsAfter8 = subtract(year, 8) as number;
  const decayedRate = subtract(r8, multiply(yearsAfter8, POST_8_DECAY_RATE)) as number;
  return max(MIN_RESIDUAL_RATE, decayedRate) as number;
}

describe("residualRate 残值率计算", () => {
  const depreciationRate3 = 0.5; // 3 年折旧 50%
  const depreciationRate5 = 0.6; // 5 年折旧 60%
  const depreciationRate8 = 0.8; // 8 年折旧 80%

  it("0 年残值率应为 95%", () => {
    expect(interpolateResidualRate(0, depreciationRate3, depreciationRate5, depreciationRate8)).toBe(0.95);
  });

  it("3 年残值率应为 50%", () => {
    expect(interpolateResidualRate(3, depreciationRate3, depreciationRate5, depreciationRate8)).toBe(0.5);
  });

  it("5 年残值率应为 40%", () => {
    expect(interpolateResidualRate(5, depreciationRate3, depreciationRate5, depreciationRate8)).toBe(0.4);
  });

  it("8 年残值率应为 20%", () => {
    expect(interpolateResidualRate(8, depreciationRate3, depreciationRate5, depreciationRate8)).toBeCloseTo(0.2, 10);
  });

  it("10 年残值率应衰减到约 17%", () => {
    const rate10 = interpolateResidualRate(10, depreciationRate3, depreciationRate5, depreciationRate8);
    // 8 年残值率 20% - 2 年 × 1.5% = 17%
    expect(rate10).toBeCloseTo(0.17, 2);
  });

  it("12 年残值率应衰减到约 14%", () => {
    const rate12 = interpolateResidualRate(12, depreciationRate3, depreciationRate5, depreciationRate8);
    // 8 年残值率 20% - 4 年 × 1.5% = 14%
    expect(rate12).toBeCloseTo(0.14, 2);
  });

  it("15 年残值率应衰减到约 9.5%", () => {
    const rate15 = interpolateResidualRate(15, depreciationRate3, depreciationRate5, depreciationRate8);
    // 8 年残值率 20% - 7 年 × 1.5% = 9.5%
    expect(rate15).toBeCloseTo(0.095, 2);
  });

  it("20 年残值率应衰减到最低 3%（报废价格）", () => {
    const rate20 = interpolateResidualRate(20, depreciationRate3, depreciationRate5, depreciationRate8);
    // 8 年残值率 20% - 12 年 × 1.5% = 2%，已达到最低值 3%
    expect(rate20).toBe(MIN_RESIDUAL_RATE);
  });

  it("25 年残值率应保持最低 3%（报废价格）", () => {
    const rate25 = interpolateResidualRate(25, depreciationRate3, depreciationRate5, depreciationRate8);
    // 已达到最低值，不再下降
    expect(rate25).toBe(MIN_RESIDUAL_RATE);
  });

  it("残值率应随年份单调递减", () => {
    const rates = [];
    for (let year = 0; year <= 30; year++) {
      rates.push(interpolateResidualRate(year, depreciationRate3, depreciationRate5, depreciationRate8));
    }
    // 验证单调递减
    for (let i = 1; i < rates.length; i++) {
      expect(rates[i]).toBeLessThanOrEqual(rates[i - 1]!);
    }
  });

  it("残值率应始终大于等于最低残值率", () => {
    for (let year = 0; year <= 50; year++) {
      const rate = interpolateResidualRate(year, depreciationRate3, depreciationRate5, depreciationRate8);
      expect(rate).toBeGreaterThanOrEqual(MIN_RESIDUAL_RATE);
    }
  });
});
