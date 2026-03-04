/**
 * 汽车综合使用成本计算
 * 使用 mathjs 进行数值运算（round 等），保证结果精度一致
 */
import { round } from "mathjs";

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
  const currentNCD = Math.max(
    config.minNCD,
    config.initialNCD - yearsWithoutClaim * config.discountStep
  );
  return round(config.basePremium * currentNCD);
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
    total += calculateAnnualPremium(t, fullConfig);
  }
  return round(total);
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
    energyCostPerKm,
  } = input;

  const dep3 = round(price * depreciationRate3);
  const dep5 = round(price * depreciationRate5);
  const dep8 = round(price * depreciationRate8);

  const ins3 = totalInsuranceNcd(insuranceFirstYear, 3);
  const ins5 = totalInsuranceNcd(insuranceFirstYear, 5);
  const ins8 = totalInsuranceNcd(insuranceFirstYear, 8);

  const annualParking = parkingFeePerYear ?? 0;
  const annualEnergyCost =
    (mileagePerYear ?? 0) * (energyCostPerKm ?? 0);

  const parking3 = annualParking * 3;
  const parking5 = annualParking * 5;
  const parking8 = annualParking * 8;

  const energy3 = annualEnergyCost * 3;
  const energy5 = annualEnergyCost * 5;
  const energy8 = annualEnergyCost * 8;

  // 一次性购置税视为购车当年发生，但在 3/5/8 年累计成本中均只计算这一笔
  const oneTimePurchaseTax = purchaseTax ?? 0;

  const totalCost3 = dep3 + ins3 + parking3 + energy3 + oneTimePurchaseTax;
  const totalCost5 = dep5 + ins5 + parking5 + energy5 + oneTimePurchaseTax;
  const totalCost8 = dep8 + ins8 + parking8 + energy8 + oneTimePurchaseTax;

  const mileage3 = mileagePerYear * 3;
  const mileage5 = mileagePerYear * 5;
  const mileage8 = mileagePerYear * 8;

  const costPerKm3 = mileage3 > 0 ? round(totalCost3 / mileage3, 2) : 0;
  const costPerKm5 = mileage5 > 0 ? round(totalCost5 / mileage5, 2) : 0;
  const costPerKm8 = mileage8 > 0 ? round(totalCost8 / mileage8, 2) : 0;

  return {
    period3: {
      depreciation: dep3,
      totalInsurance: ins3,
      totalParking: parking3,
      totalEnergy: energy3,
      totalCost: totalCost3,
      totalMileage: mileage3,
      costPerKm: costPerKm3,
    },
    period5: {
      depreciation: dep5,
      totalInsurance: ins5,
      totalParking: parking5,
      totalEnergy: energy5,
      totalCost: totalCost5,
      totalMileage: mileage5,
      costPerKm: costPerKm5,
    },
    period8: {
      depreciation: dep8,
      totalInsurance: ins8,
      totalParking: parking8,
      totalEnergy: energy8,
      totalCost: totalCost8,
      totalMileage: mileage8,
      costPerKm: costPerKm8,
    },
  };
}
