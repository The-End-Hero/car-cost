import { describe, expect, it } from "vitest";
import { calculateCarFinancial } from "./carFinancialAnalyzer";

describe("carFinancialAnalyzer 计算", () => {
  it("主路径应返回一致的现金流、机会成本和净财富关系", () => {
    const result = calculateCarFinancial(
      {
        price: 300000,
        downPayment: 90000,
        taxAndInsurance: 30000,
        optionCost: 20000,
        optionResidualRate: 0.1,
        loanMonths: 36,
        annualLoanRate: 0.06,
        monthlyOpEx: 2000,
        residualRate: 0.5,
        marketReturnRate: 0.04,
      },
      5
    );

    // 主路径：有贷款时月供应大于 0，且 5 年分析应有 0~5 共 6 个年度点
    expect(result.monthlyPayment).toBeGreaterThan(0);
    expect(result.series).toHaveLength(6);
    expect(result.series[0]?.loanRemaining).toBe(210000);
    expect(result.summary.loanRemainingAtEnd).toBe(0);
    expect(result.summary.vehicleResidual).toBe(150000);
    expect(result.summary.optionResidual).toBe(2000);
    expect(result.summary.totalResidualAtEnd).toBe(152000);

    // totalOutflow = 初始支出(首付+税险+选配) + 贷款期月供 + 全期月度养车费
    const expectedOutflow = 140000 + result.monthlyPayment * 36 + 2000 * 60;
    expect(result.summary.totalOutflow).toBeCloseTo(expectedOutflow, 6);

    // 交叉验证关键关系：
    // lostInvestmentGain = opportunityCostWealth - totalOutflow
    // netWealthImpact = opportunityCostWealth - totalResidualAtEnd + loanRemainingAtEnd
    const lastSeries = result.series[result.series.length - 1];
    const finalOpportunityCost = lastSeries?.opportunityCostWealth ?? 0;
    expect(result.summary.lostInvestmentGain).toBeCloseTo(
      finalOpportunityCost - result.summary.totalOutflow,
      6
    );
    expect(result.summary.netWealthImpact).toBeCloseTo(
      finalOpportunityCost - result.summary.totalResidualAtEnd + result.summary.loanRemainingAtEnd,
      6
    );
  });

  it("无贷款场景应返回 0 月供与 0 剩余本金", () => {
    const result = calculateCarFinancial(
      {
        price: 300000,
        downPayment: 300000,
        taxAndInsurance: 25000,
        loanMonths: 36,
        annualLoanRate: 0.05,
        monthlyOpEx: 1000,
        residualRate: 0.45,
        marketReturnRate: 0.03,
      },
      3
    );

    // 首付覆盖车价后，不应产生贷款相关现金流与剩余本金
    expect(result.monthlyPayment).toBe(0);
    expect(result.summary.loanRemainingAtEnd).toBe(0);
    expect(result.series.every((point) => point.loanRemaining === 0)).toBe(true);
    expect(result.summary.totalOutflow).toBe(300000 + 25000 + 1000 * 36);
    expect(result.summary.optionResidual).toBe(0);
  });

  it("residualByYear 应覆盖默认期末残值并影响每年净财富缩水", () => {
    const result = calculateCarFinancial(
      {
        price: 200000,
        downPayment: 50000,
        taxAndInsurance: 10000,
        loanMonths: 24,
        annualLoanRate: 0.05,
        monthlyOpEx: 1500,
        residualRate: 0.4,
        residualByYear: [100000, 90000, 80000],
        marketReturnRate: 0.03,
      },
      2
    );

    // 分析期为 2 年，期末残值应取 residualByYear[2] 而不是默认 residualRate 推导值
    expect(result.summary.totalResidualAtEnd).toBe(80000);

    const year1 = result.series.find((point) => point.year === 1);
    expect(year1).toBeDefined();
    if (!year1) return;

    // 年度净财富缩水同样遵循：opportunityCostWealth - 当年残值 + 当年贷款余额
    expect(year1.netWealthLoss).toBeCloseTo(
      year1.opportunityCostWealth - 90000 + year1.loanRemaining,
      6
    );
  });
});
