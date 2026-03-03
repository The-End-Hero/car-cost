/**
 * 汽车综合使用成本计算
 * 使用 math.js 进行数值运算（round 等），保证结果精度一致
 */
import math from "math.js";

export interface CarCostInput {
  /** 车价（元） */
  price: number;
  /** 3 年折旧率，0-1 小数 */
  depreciationRate3: number;
  /** 5 年折旧率，0-1 小数 */
  depreciationRate5: number;
  /** 8 年折旧率，0-1 小数 */
  depreciationRate8: number;
  /** 首年保险（元） */
  insuranceFirstYear: number;
  /** 年里程（公里） */
  mileagePerYear: number;
  /** 总保险计算年数 */
  insuranceYears?: 3 | 5 | 8;
}

export interface PeriodResult {
  depreciation: number;
  totalInsurance: number;
  totalCost: number;
  totalMileage: number;
  costPerKm: number;
}

export interface CarCostResult {
  period3: PeriodResult;
  period5: PeriodResult;
  period8: PeriodResult;
}

/**
 * 计算指定年数的总保险（固定首年价 × 年数）
 */
function totalInsurance(firstYear: number, years: number): number {
  return math.round(firstYear * years);
}

/**
 * 根据输入计算 3/5/8 年折旧、总保险、综合成本与每公里成本
 */
export function calcCarCost(input: CarCostInput): CarCostResult {
  const {
    price,
    depreciationRate3,
    depreciationRate5,
    depreciationRate8,
    insuranceFirstYear,
    mileagePerYear,
  } = input;

  const dep3 = math.round(price * depreciationRate3);
  const dep5 = math.round(price * depreciationRate5);
  const dep8 = math.round(price * depreciationRate8);

  const ins3 = totalInsurance(insuranceFirstYear, 3);
  const ins5 = totalInsurance(insuranceFirstYear, 5);
  const ins8 = totalInsurance(insuranceFirstYear, 8);

  const totalCost3 = dep3 + ins3;
  const totalCost5 = dep5 + ins5;
  const totalCost8 = dep8 + ins8;

  const mileage3 = mileagePerYear * 3;
  const mileage5 = mileagePerYear * 5;
  const mileage8 = mileagePerYear * 8;

  const costPerKm3 = mileage3 > 0 ? math.round((totalCost3 / mileage3) * 100) / 100 : 0;
  const costPerKm5 = mileage5 > 0 ? math.round((totalCost5 / mileage5) * 100) / 100 : 0;
  const costPerKm8 = mileage8 > 0 ? math.round((totalCost8 / mileage8) * 100) / 100 : 0;

  return {
    period3: {
      depreciation: dep3,
      totalInsurance: ins3,
      totalCost: totalCost3,
      totalMileage: mileage3,
      costPerKm: costPerKm3,
    },
    period5: {
      depreciation: dep5,
      totalInsurance: ins5,
      totalCost: totalCost5,
      totalMileage: mileage5,
      costPerKm: costPerKm5,
    },
    period8: {
      depreciation: dep8,
      totalInsurance: ins8,
      totalCost: totalCost8,
      totalMileage: mileage8,
      costPerKm: costPerKm8,
    },
  };
}
