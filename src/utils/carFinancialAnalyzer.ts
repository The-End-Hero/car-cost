/**
 * 购车现金流与机会成本分析器
 * 将汽车视为贬值资产，对比与投资增值资产的机会成本差额
 * 使用 mathjs 进行数值运算，保证结果精度一致
 */
import { add, divide, max, min, multiply, pow, subtract } from "mathjs";

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
  /**
   * 分析期内每年末的总残值（车辆+选配），索引为年份 0..analysisYears。
   * 若提供，则各年净财富缩水按当期卖出总残值计算；未提供时退回到使用期末总残值。
   */
  residualByYear?: number[];
  /** 理财年化收益率（机会成本基准），如 0.04 表示 4% */
  marketReturnRate: number;
}

export interface CashFlowSeriesPoint {
  year: number;
  totalOutflow: number;
  opportunityCostWealth: number;
  netWealthLoss: number;
  /** 该年末尚未还清的贷款本金（元），若无贷款则为 0 */
  loanRemaining: number;
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
 * 等额本息月供（annuity / equal installment，每期还款额固定）
 * 公式: P * r * (1+r)^n / ((1+r)^n - 1)
 * 注：若后续增加等额本金（equal principal）还款方式，请另写函数区分。
 */
function monthlyPaymentAnnuity(
  principal: number,
  annualRate: number,
  months: number
): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = divide(annualRate, 12) as number;
  const factor = pow(add(1, r), months) as number;
  return divide(
    multiply(multiply(principal, r), factor),
    subtract(factor, 1)
  ) as number;
}

/**
 * 构建等额本息还款下每个月还款后的剩余本金序列
 * 数组下标为月份数：index=0 表示尚未还款时的本金；index=m 表示第 m 期还款后剩余本金
 */
function buildRemainingPrincipalSchedule(
  loanAmount: number,
  annualRate: number,
  loanMonths: number,
  monthlyPayment: number
): number[] {
  if (loanAmount <= 0 || loanMonths <= 0 || monthlyPayment <= 0) {
    return [];
  }
  const r = divide(annualRate, 12) as number;
  const schedule: number[] = [];
  let remaining = loanAmount;
  schedule[0] = loanAmount;
  for (let m = 1; m <= loanMonths; m++) {
    const interest = multiply(remaining, r) as number;
    const principalPay = max(0, subtract(monthlyPayment, interest)) as number;
    remaining = max(0, subtract(remaining, principalPay)) as number;
    schedule[m] = remaining;
  }
  return schedule;
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

  const months = multiply(analysisYears, 12) as number;
  const monthlyInvRate = divide(marketReturnRate, 12) as number;
  const loanAmount = max(0, subtract(price, downPayment)) as number;
  const monthlyPay =
    loanAmount > 0 && loanMonths > 0
      ? monthlyPaymentAnnuity(loanAmount, annualLoanRate, loanMonths)
      : 0;
  const remainingPrincipalSchedule =
    loanAmount > 0 && loanMonths > 0 && monthlyPay > 0
      ? buildRemainingPrincipalSchedule(
          loanAmount,
          annualLoanRate,
          loanMonths,
          monthlyPay
        )
      : [];

  const getLoanRemainingAtMonth = (month: number): number => {
    if (loanAmount <= 0 || loanMonths <= 0 || monthlyPay <= 0) {
      return 0;
    }
    if (!remainingPrincipalSchedule.length) return 0;
    if (month <= 0) return loanAmount;
    if (month >= remainingPrincipalSchedule.length) return 0;
    return remainingPrincipalSchedule[month] ?? 0;
  };

  const initialOutflow = add(
    add(downPayment, taxAndInsurance),
    optionCost
  ) as number;
  let totalNominalOutflow = initialOutflow;
  let opportunityCostWealth = initialOutflow;

  const finalVehicleValue = multiply(price, residualRate) as number;
  const finalOptionResidual = multiply(
    optionCost,
    totalResidualRate
  ) as number;
  const totalFinalResidual = add(
    finalVehicleValue,
    finalOptionResidual
  ) as number;

  const getResidualAtYear = (year: number): number => {
    if (
      Array.isArray(input.residualByYear) &&
      year >= 0 &&
      year < input.residualByYear.length
    ) {
      return input.residualByYear[year] as number;
    }
    return totalFinalResidual;
  };

  const series: CashFlowSeriesPoint[] = [
    {
      year: 0,
      totalOutflow: totalNominalOutflow,
      opportunityCostWealth,
      loanRemaining: loanAmount,
      netWealthLoss: add(
        subtract(opportunityCostWealth, getResidualAtYear(0)),
        loanAmount
      ) as number,
    },
  ];

  for (let m = 1; m <= months; m++) {
    const loanPay = m <= loanMonths ? monthlyPay : 0;
    const currentMonthOutflow = add(loanPay, monthlyOpEx) as number;
    totalNominalOutflow = add(
      totalNominalOutflow,
      currentMonthOutflow
    ) as number;
    opportunityCostWealth = add(
      multiply(opportunityCostWealth, add(1, monthlyInvRate)),
      currentMonthOutflow
    ) as number;

    if (m % 12 === 0) {
      const year = divide(m, 12) as number;
      const loanRemainingAtYear = getLoanRemainingAtMonth(
        min(m, loanMonths) as number
      );
      series.push({
        year,
        totalOutflow: totalNominalOutflow,
        opportunityCostWealth,
        loanRemaining: loanRemainingAtYear,
        netWealthLoss: add(
          subtract(opportunityCostWealth, getResidualAtYear(year)),
          loanRemainingAtYear
        ) as number,
      });
    }
  }

  const finalResidualForNet = getResidualAtYear(analysisYears);
  const monthsAtEnd = min(months, loanMonths) as number;
  const loanRemainingAtEnd = getLoanRemainingAtMonth(monthsAtEnd);
  const netWealthLoss = add(
    subtract(opportunityCostWealth, finalResidualForNet),
    loanRemainingAtEnd
  ) as number;
  const lostInvestmentGain = subtract(
    opportunityCostWealth,
    totalNominalOutflow
  ) as number;
  const costPerYear = divide(netWealthLoss, analysisYears) as number;

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
      monthlyCost: divide(costPerYear, 12) as number,
    },
    series,
    monthlyPayment: monthlyPay,
  };
}
