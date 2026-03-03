/**
 * 购车现金流与机会成本分析器
 * 将汽车视为贬值资产，对比与投资增值资产的机会成本差额
 */

export interface CarFinancialAnalyzerInput {
  /** 车价（元） */
  price: number;
  /** 首付（元） */
  downPayment: number;
  /** 购置税、首年保险、上牌等初始杂费（元） */
  taxAndInsurance: number;
  /** 选配费用（元），购车时一次性支付，多数选配保值率低于车体 */
  optionCost?: number;
  /** 选配在分析期末的残值率 0~1，默认低于车辆残值率，如 0.2 表示 20% */
  optionResidualRate?: number;
  /** 贷款月数 */
  loanMonths: number;
  /** 贷款年化利率，如 0.03 表示 3% */
  annualLoanRate: number;
  /** 平均月度养车费用：油/电、停车、保养等（元） */
  monthlyOpEx: number;
  /** 分析期末残值率 0~1，如 0.4 表示 40% */
  residualRate: number;
  /** 理财年化收益率（机会成本基准），如 0.04 表示 4% */
  marketReturnRate: number;
}

export interface CashFlowSeriesPoint {
  year: number;
  totalOutflow: number;
  opportunityCostWealth: number;
  netWealthLoss: number;
}

export interface CarFinancialSummary {
  totalOutflow: number;
  vehicleResidual: number;
  /** 选配期末残值（选配费用 × 选配残值率） */
  optionResidual: number;
  lostInvestmentGain: number;
  netWealthImpact: number;
}

export interface CarFinancialEfficiency {
  annualCost: number;
  monthlyCost: number;
}

export interface CarFinancialResult {
  summary: CarFinancialSummary;
  efficiency: CarFinancialEfficiency;
  series: CashFlowSeriesPoint[];
  /** 等额本息月供（元），供支出构成图使用 */
  monthlyPayment: number;
}

/**
 * 等额本息月供
 * 公式: P * r * (1+r)^n / ((1+r)^n - 1)
 */
function monthlyPaymentEqualPrincipal(
  principal: number,
  annualRate: number,
  months: number
): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRate / 12;
  const factor = Math.pow(1 + r, months);
  return (principal * r * factor) / (factor - 1);
}

/**
 * 购车财务影响分析
 * @param input 分析参数
 * @param analysisYears 分析年数，如 5
 */
export function calculateCarFinancial(
  input: CarFinancialAnalyzerInput,
  analysisYears: number
): CarFinancialResult {
  const {
    price,
    downPayment,
    taxAndInsurance,
    loanMonths,
    annualLoanRate,
    monthlyOpEx,
    residualRate,
    marketReturnRate,
  } = input;

  const optionCost = input.optionCost ?? 0;
  const optionResidualRate = input.optionResidualRate ?? 0.2;
  const totalResidualRate = optionCost > 0 ? optionResidualRate : 0;

  const months = analysisYears * 12;
  const monthlyInvRate = marketReturnRate / 12;
  const loanAmount = Math.max(0, price - downPayment);
  const monthlyPay =
    loanAmount > 0 && loanMonths > 0
      ? monthlyPaymentEqualPrincipal(loanAmount, annualLoanRate, loanMonths)
      : 0;

  const initialOutflow = downPayment + taxAndInsurance + optionCost;
  let totalNominalOutflow = initialOutflow;
  let opportunityCostWealth = initialOutflow;

  const finalVehicleValue = price * residualRate;
  const finalOptionResidual = optionCost * totalResidualRate;
  const totalFinalResidual = finalVehicleValue + finalOptionResidual;

  const series: CashFlowSeriesPoint[] = [
    {
      year: 0,
      totalOutflow: totalNominalOutflow,
      opportunityCostWealth,
      netWealthLoss: opportunityCostWealth - totalFinalResidual,
    },
  ];

  for (let m = 1; m <= months; m++) {
    const loanPay = m <= loanMonths ? monthlyPay : 0;
    const currentMonthOutflow = loanPay + monthlyOpEx;
    totalNominalOutflow += currentMonthOutflow;
    opportunityCostWealth =
      opportunityCostWealth * (1 + monthlyInvRate) + currentMonthOutflow;

    if (m % 12 === 0) {
      const year = m / 12;
      series.push({
        year,
        totalOutflow: totalNominalOutflow,
        opportunityCostWealth,
        netWealthLoss: opportunityCostWealth - totalFinalResidual,
      });
    }
  }

  const netWealthLoss = opportunityCostWealth - totalFinalResidual;
  const lostInvestmentGain = opportunityCostWealth - totalNominalOutflow;
  const costPerYear = netWealthLoss / analysisYears;

  return {
    summary: {
      totalOutflow: totalNominalOutflow,
      vehicleResidual: finalVehicleValue,
      optionResidual: finalOptionResidual,
      lostInvestmentGain,
      netWealthImpact: netWealthLoss,
    },
    efficiency: {
      annualCost: costPerYear,
      monthlyCost: costPerYear / 12,
    },
    series,
    monthlyPayment: monthlyPay,
  };
}
