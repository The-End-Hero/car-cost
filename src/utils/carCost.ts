/**
 * 汽车综合使用成本计算
 * 使用 mathjs 进行数值运算（round 等），保证结果精度一致
 */
import { add, divide, max, multiply, round, subtract } from "mathjs";

export interface CarCostInput {
  /** 车价（元） */
  price: number;
  /** 3 年折旧率，0-1 小数 */
  depreciationRate3: number;
  /** 5 年折旧率，0-1 小数 */
  depreciationRate5: number;
  /** 8 年折旧率，0-1 小数 */
  depreciationRate8: number;
  /** 购置税等一次性支出（元），默认 0，视为在购车当年一次性发生，但计入各期累计成本中 */
  purchaseTax?: number;
  /** 首年保险（元） */
  insuranceFirstYear: number;
  /** 年里程（公里） */
  mileagePerYear: number;
  /** 年停车费（元/年），可为 0 */
  parkingFeePerYear?: number;
  /** 年保养费（元/年），可为 0 */
  maintenanceFeePerYear?: number;
  /** 年事故违章费（元/年），可为 0 */
  violationAccidentFeePerYear?: number;
  /** 每公里能源费用（元/公里），可为 0 */
  energyCostPerKm?: number;
  /** 总保险计算年数 */
  insuranceYears?: 3 | 5 | 8;
}

export interface PeriodResult {
  depreciation: number;
  totalInsurance: number;
   /** N 年总停车费 */
  totalParking: number;
   /** N 年总保养费 */
  totalMaintenance: number;
   /** N 年总事故违章费 */
  totalViolationAccident: number;
   /** N 年总能源费 */
  totalEnergy: number;
  totalCost: number;
  totalMileage: number;
  costPerKm: number;
}

export interface CarCostResult {
  period3: PeriodResult;
  period5: PeriodResult;
  period8: PeriodResult;
}

/** NCD（无赔款优待）保险配置，用于按年递减保费计算 */
export interface InsuranceNcdConfig {
  /** 基础保费（元），通常为首年保费 */
  basePremium: number;
  /** 最低折扣系数，保费不低于 basePremium × minNCD，如 0.4 表示最多 4 折 */
  minNCD: number;
  /** 每年未出险的折扣步长，如 0.1 表示每年减 10% */
  discountStep: number;
  /** 首年 NCD 系数（新车），通常为 1.0 */
  initialNCD: number;
}

const DEFAULT_MIN_NCD = 0.4;
const DEFAULT_DISCOUNT_STEP = 0.1;
const DEFAULT_INITIAL_NCD = 1.0;

/**
 * 计算单年保费（按连续未出险年数应用 NCD）
 * @param yearsWithoutClaim 连续未出险年数，0 表示第 1 年
 * @param config NCD 配置
 */
export function calculateAnnualPremium(
  yearsWithoutClaim: number,
  config: InsuranceNcdConfig
): number {
  const currentNCD = max(
    config.minNCD,
    subtract(config.initialNCD, multiply(yearsWithoutClaim, config.discountStep))
  ) as number;
  return round(multiply(config.basePremium, currentNCD)) as number;
}

/**
 * 计算 N 年总保险（假设连续未出险，每年保费按 NCD 递减）
 */
function totalInsuranceNcd(
  basePremium: number,
  years: number,
  config?: Partial<Pick<InsuranceNcdConfig, "minNCD" | "discountStep" | "initialNCD">>
): number {
  const fullConfig: InsuranceNcdConfig = {
    basePremium,
    minNCD: config?.minNCD ?? DEFAULT_MIN_NCD,
    discountStep: config?.discountStep ?? DEFAULT_DISCOUNT_STEP,
    initialNCD: config?.initialNCD ?? DEFAULT_INITIAL_NCD,
  };
  let total = 0;
  for (let t = 0; t < years; t++) {
    total = add(total, calculateAnnualPremium(t, fullConfig)) as number;
  }
  return round(total) as number;
}

/**
 * 返回 N 年内各年保费（NCD 递减），用于展示各年明细
 */
export function getAnnualPremiums(
  basePremium: number,
  years: number,
  config?: Partial<Pick<InsuranceNcdConfig, "minNCD" | "discountStep" | "initialNCD">>
): number[] {
  const fullConfig: InsuranceNcdConfig = {
    basePremium,
    minNCD: config?.minNCD ?? DEFAULT_MIN_NCD,
    discountStep: config?.discountStep ?? DEFAULT_DISCOUNT_STEP,
    initialNCD: config?.initialNCD ?? DEFAULT_INITIAL_NCD,
  };
  const arr: number[] = [];
  for (let t = 0; t < years; t++) {
    arr.push(calculateAnnualPremium(t, fullConfig));
  }
  return arr;
}

/** 月均养车费计算说明，供 UI 展示 */
export const MONTHLY_OPEX_CALC_DESCRIPTION =
  "由年停车费、年保养费、年保险费（3 年平均）、年事故违章费、年能源费合计后 ÷12 得出，用于现金流与机会成本分析。";

export interface MonthlyOpExFromAnnualParams {
  insuranceFirstYear: number;
  parkingFeePerYear?: number;
  maintenanceFeePerYear?: number;
  violationAccidentFeePerYear?: number;
  mileagePerYear: number;
  energyCostPerKm?: number;
}

/**
 * 根据年度费用计算月均养车费（不含折旧与购置税）
 * 年养车费 = 年停车费 + 年保养费 + 年保险费(3年平均) + 年事故违章费 + 年能源费；月均 = 年养车费 / 12
 */
export function calcMonthlyOpExFromAnnual(params: MonthlyOpExFromAnnualParams): number {
  const {
    insuranceFirstYear,
    parkingFeePerYear = 0,
    maintenanceFeePerYear = 0,
    violationAccidentFeePerYear = 0,
    mileagePerYear,
    energyCostPerKm = 0,
  } = params;
  const annualInsurance = totalInsuranceNcd(insuranceFirstYear, 3) / 3;
  const annualEnergy = multiply(mileagePerYear, energyCostPerKm) as number;
  const annualTotal = add(
    add(
      add(add(parkingFeePerYear, maintenanceFeePerYear), annualInsurance),
      violationAccidentFeePerYear
    ),
    annualEnergy
  ) as number;
  return round(divide(annualTotal, 12), 2) as number;
}

/**
 * 根据输入计算 3/5/8 年折旧、总保险（NCD 按年递减）、综合成本与每公里成本
 */
export function calcCarCost(input: CarCostInput): CarCostResult {
  const {
    price,
    depreciationRate3,
    depreciationRate5,
    depreciationRate8,
    purchaseTax,
    insuranceFirstYear,
    mileagePerYear,
    parkingFeePerYear,
    maintenanceFeePerYear,
    violationAccidentFeePerYear,
    energyCostPerKm,
  } = input;

  const dep3 = round(multiply(price, depreciationRate3)) as number;
  const dep5 = round(multiply(price, depreciationRate5)) as number;
  const dep8 = round(multiply(price, depreciationRate8)) as number;

  const ins3 = totalInsuranceNcd(insuranceFirstYear, 3);
  const ins5 = totalInsuranceNcd(insuranceFirstYear, 5);
  const ins8 = totalInsuranceNcd(insuranceFirstYear, 8);

  const annualParking = parkingFeePerYear ?? 0;
  const annualMaintenance = maintenanceFeePerYear ?? 0;
  const annualViolationAccident = violationAccidentFeePerYear ?? 0;
  const annualEnergyCost = multiply(
    mileagePerYear ?? 0,
    energyCostPerKm ?? 0
  ) as number;

  const parking3 = multiply(annualParking, 3) as number;
  const parking5 = multiply(annualParking, 5) as number;
  const parking8 = multiply(annualParking, 8) as number;

  const maintenance3 = multiply(annualMaintenance, 3) as number;
  const maintenance5 = multiply(annualMaintenance, 5) as number;
  const maintenance8 = multiply(annualMaintenance, 8) as number;

  const violationAccident3 = multiply(annualViolationAccident, 3) as number;
  const violationAccident5 = multiply(annualViolationAccident, 5) as number;
  const violationAccident8 = multiply(annualViolationAccident, 8) as number;

  const energy3 = multiply(annualEnergyCost, 3) as number;
  const energy5 = multiply(annualEnergyCost, 5) as number;
  const energy8 = multiply(annualEnergyCost, 8) as number;

  // 一次性购置税视为购车当年发生，但在 3/5/8 年累计成本中均只计算这一笔
  const oneTimePurchaseTax = purchaseTax ?? 0;

  const totalCost3 = add(
    add(add(add(add(add(dep3, ins3), parking3), maintenance3), violationAccident3), energy3),
    oneTimePurchaseTax
  ) as number;
  const totalCost5 = add(
    add(add(add(add(add(dep5, ins5), parking5), maintenance5), violationAccident5), energy5),
    oneTimePurchaseTax
  ) as number;
  const totalCost8 = add(
    add(add(add(add(add(dep8, ins8), parking8), maintenance8), violationAccident8), energy8),
    oneTimePurchaseTax
  ) as number;

  const mileage3 = multiply(mileagePerYear, 3) as number;
  const mileage5 = multiply(mileagePerYear, 5) as number;
  const mileage8 = multiply(mileagePerYear, 8) as number;

  const costPerKm3 =
    mileage3 > 0 ? (round(divide(totalCost3, mileage3), 2) as number) : 0;
  const costPerKm5 =
    mileage5 > 0 ? (round(divide(totalCost5, mileage5), 2) as number) : 0;
  const costPerKm8 =
    mileage8 > 0 ? (round(divide(totalCost8, mileage8), 2) as number) : 0;

  return {
    period3: {
      depreciation: dep3,
      totalInsurance: ins3,
      totalParking: parking3,
      totalMaintenance: maintenance3,
      totalViolationAccident: violationAccident3,
      totalEnergy: energy3,
      totalCost: totalCost3,
      totalMileage: mileage3,
      costPerKm: costPerKm3,
    },
    period5: {
      depreciation: dep5,
      totalInsurance: ins5,
      totalParking: parking5,
      totalMaintenance: maintenance5,
      totalViolationAccident: violationAccident5,
      totalEnergy: energy5,
      totalCost: totalCost5,
      totalMileage: mileage5,
      costPerKm: costPerKm5,
    },
    period8: {
      depreciation: dep8,
      totalInsurance: ins8,
      totalParking: parking8,
      totalMaintenance: maintenance8,
      totalViolationAccident: violationAccident8,
      totalEnergy: energy8,
      totalCost: totalCost8,
      totalMileage: mileage8,
      costPerKm: costPerKm8,
    },
  };
}
