import { describe, expect, it } from "vitest";
import {
  calcCarCost,
  calcMonthlyOpExFromAnnual,
  calculateAnnualPremium,
  getAnnualPremiums,
} from "./carCost";

describe("carCost 计算", () => {
  it("calculateAnnualPremium 应按 NCD 递减并受 minNCD 下限约束", () => {
    const config = {
      basePremium: 10000,
      minNCD: 0.4,
      discountStep: 0.1,
      initialNCD: 1,
    };

    // t=0 对应首年，不应用折扣
    expect(calculateAnnualPremium(0, config)).toBe(10000);
    expect(calculateAnnualPremium(1, config)).toBe(9000);
    expect(calculateAnnualPremium(5, config)).toBe(5000);
    // 折扣继续下降时应被 minNCD 封顶（不再低于 4 折）
    expect(calculateAnnualPremium(10, config)).toBe(4000);
  });

  it("getAnnualPremiums 应返回逐年保费序列", () => {
    expect(getAnnualPremiums(10000, 5)).toEqual([10000, 9000, 8000, 7000, 6000]);
  });

  it("calcMonthlyOpExFromAnnual 应正确计算月均养车费并保留两位小数", () => {
    const monthly = calcMonthlyOpExFromAnnual({
      insuranceFirstYear: 6000,
      parkingFeePerYear: 1200,
      maintenanceFeePerYear: 2400,
      violationAccidentFeePerYear: 600,
      mileagePerYear: 12000,
      energyCostPerKm: 0.6,
    });

    // 年保险按 3 年 NCD 平均后再与其他年费汇总，最后除以 12
    expect(monthly).toBe(1400);
  });

  it("calcCarCost 应正确汇总 3/5/8 年成本并计算每公里成本", () => {
    const result = calcCarCost({
      price: 200000,
      depreciationRate3: 0.35,
      depreciationRate5: 0.5,
      depreciationRate8: 0.7,
      purchaseTax: 10000,
      insuranceFirstYear: 6000,
      mileagePerYear: 10000,
      parkingFeePerYear: 1000,
      maintenanceFeePerYear: 2000,
      violationAccidentFeePerYear: 500,
      energyCostPerKm: 0.7,
    });

    // 重点校验：一次性购置税只计入一次；每公里成本按 totalCost/totalMileage 并 round(2)
    expect(result.period3).toMatchObject({
      depreciation: 70000,
      totalInsurance: 16200,
      totalParking: 3000,
      totalMaintenance: 6000,
      totalViolationAccident: 1500,
      totalEnergy: 21000,
      totalCost: 127700,
      totalMileage: 30000,
      costPerKm: 4.26,
    });

    expect(result.period5).toMatchObject({
      depreciation: 100000,
      totalInsurance: 24000,
      totalParking: 5000,
      totalMaintenance: 10000,
      totalViolationAccident: 2500,
      totalEnergy: 35000,
      totalCost: 186500,
      totalMileage: 50000,
      costPerKm: 3.73,
    });

    expect(result.period8).toMatchObject({
      depreciation: 140000,
      totalInsurance: 31800,
      totalParking: 8000,
      totalMaintenance: 16000,
      totalViolationAccident: 4000,
      totalEnergy: 56000,
      totalCost: 265800,
      totalMileage: 80000,
      costPerKm: 3.32,
    });
  });

  it("calcCarCost 在总里程为 0 时 costPerKm 应返回 0", () => {
    const result = calcCarCost({
      price: 150000,
      depreciationRate3: 0.3,
      depreciationRate5: 0.45,
      depreciationRate8: 0.65,
      insuranceFirstYear: 5000,
      mileagePerYear: 0,
    });

    // 防止除零导致 Infinity/NaN
    expect(result.period3.costPerKm).toBe(0);
    expect(result.period5.costPerKm).toBe(0);
    expect(result.period8.costPerKm).toBe(0);
  });
});
