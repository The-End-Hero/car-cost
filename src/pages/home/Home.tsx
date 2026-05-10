import { motion } from "motion/react";
import { Button, Card, Collapse, Form, InputNumber, Statistic, Typography } from "antd";
import { useWatch } from "antd/es/form/Form";
import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import { useThemeStore } from "@/stores/theme";
import {
  calcCarCost,
  calcMonthlyOpExFromAnnual,
  getAnnualPremiums,
  MONTHLY_OPEX_CALC_DESCRIPTION,
} from "@/utils/carCost";
import {
  calculateCarFinancial,
  type CarFinancialResult,
} from "@/utils/carFinancialAnalyzer";
import { snapdom } from "@zumer/snapdom";
import { add, divide, min, max, multiply, round, subtract } from "mathjs";

const DEFAULT_PRICE = 253900;
const DEFAULT_RATE_3 = 0.5;
const DEFAULT_RATE_5 = 0.6;
const DEFAULT_RATE_8 = 0.8;
const DEFAULT_INSURANCE = 7500;
const DEFAULT_MILEAGE = 12000;
const DEFAULT_PARKING_FEE_PER_YEAR = 0;
const DEFAULT_MAINTENANCE_FEE_PER_YEAR = 0;
const DEFAULT_VIOLATION_ACCIDENT_FEE_PER_YEAR = 0;
const DEFAULT_ENERGY_COST_PER_KM = 0.1;
const DEFAULT_INITIAL_ONE_TIME_FEE = 10000;
const DEFAULT_DOWN_PAYMENT = 90000;
const DEFAULT_LOAN_MONTHS = 36;
const DEFAULT_ANNUAL_LOAN_RATE = 0.03;
const DEFAULT_MARKET_RETURN_RATE = 0.04;
const DEFAULT_ANALYSIS_YEARS = 5;
const DEFAULT_OPTION_COST = 0;
const DEFAULT_OPTION_RESIDUAL_RATE = 0.2;

const INPUT_NUMBER_WIDTH = 260;

function formatMoney(n: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * 最低残值率（约等于报废价格）
 * 基于中国市场：
 * - 燃油车整备质量约 1.2-1.5 吨，废钢价格约 2000-3000 元/吨，报废价约 2400-4500 元
 * - 新能源车整备质量约 1.8-2.2 吨（电池重），加上电池回收价值，报废价约 4000-8000 元
 * - 20 万左右的新能源车，报废价约 5000-8000 元，残值率约 2.5-4%
 * 取 3% 作为最低残值率，适用于大多数乘用车
 */
const MIN_RESIDUAL_RATE = 0.03;

/**
 * 8 年后每年残值衰减率
 * 根据中国汽车流通协会数据，8 年以上车辆每年残值率下降约 1-2%
 * 取 1.5% 作为中间值
 */
const POST_8_DECAY_RATE = 0.015;

/**
 * 根据 3/5/8 年折旧率做分段线性插值，得到指定年份末的车辆残值率（0~1）
 * 已知点：(0, 0.95) 即购车后马上当二手卖约 95%，(3, 1-r3), (5, 1-r5), (8, 1-r8)
 * year > 8 时继续衰减，最低不低于 MIN_RESIDUAL_RATE（约报废价格）
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

function buildResidualByYearArray(
  price: number,
  depreciationRate3: number,
  depreciationRate5: number,
  depreciationRate8: number,
  analysisYears: number,
  optionCost: number,
  optionResidualRate: number
): number[] {
  const rateAtEnd = interpolateResidualRate(
    analysisYears,
    depreciationRate3,
    depreciationRate5,
    depreciationRate8
  );
  const arr: number[] = [];
  for (let year = 0; year <= analysisYears; year++) {
    const rate = interpolateResidualRate(
      year,
      depreciationRate3,
      depreciationRate5,
      depreciationRate8
    );
    const vehicleResidual = multiply(price, rate) as number;
    const optionResidual =
      optionCost > 0 && rateAtEnd > 0
        ? (multiply(
            multiply(optionCost, divide(rate, rateAtEnd)),
            optionResidualRate
          ) as number)
        : 0;
    arr.push(add(vehicleResidual, optionResidual) as number);
  }
  return arr;
}

interface FormValues {
  price: number;
  depreciationRate3: number;
  depreciationRate5: number;
  depreciationRate8: number;
  insuranceFirstYear: number;
  /** 购置税、上牌、等一次性支出（元），同时用于综合成本与现金流模块 */
  initialOneTimeFee: number;
  mileagePerYear: number;
  parkingFeePerYear: number;
  maintenanceFeePerYear: number;
  violationAccidentFeePerYear: number;
  energyCostPerKm: number;
  downPayment: number;
  loanMonths: number;
  annualLoanRate: number;
  /** 由年度费用自动计算，仅展示用，不参与表单提交 */
  monthlyOpEx?: number;
  marketReturnRate: number;
  analysisYears: number;
  optionCost: number;
  optionResidualRate: number;
}

const DepreciationHint = () => (
  <Collapse
    items={[
      {
        key: "1",
        label: "电动车 vs 燃油车 折旧率对比（中国市场平均参考值）",
        children: (
          <div className="space-y-2 text-sm">
            <table className="w-full border-collapse border border-solid border-gray-300 dark:border-gray-600">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  <th className="border border-gray-300 dark:border-gray-600 p-1">车龄</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-1">电动车残值率</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-1">电动车折旧率</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-1">燃油车残值率</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-1">燃油车折旧率</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 dark:border-gray-600 p-1">3 年</td>
                  <td className="border border-gray-300 dark:border-gray-600 p-1">43% - 55%</td>
                  <td className="border border-gray-300 dark:border-gray-600 p-1">45% - 57%</td>
                  <td className="border border-gray-300 dark:border-gray-600 p-1">48% - 65%</td>
                  <td className="border border-gray-300 dark:border-gray-600 p-1">35% - 52%</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 dark:border-gray-600 p-1">5 年</td>
                  <td className="border border-gray-300 dark:border-gray-600 p-1">35% - 51%</td>
                  <td className="border border-gray-300 dark:border-gray-600 p-1">49% - 65%</td>
                  <td className="border border-gray-300 dark:border-gray-600 p-1">50% - 61%</td>
                  <td className="border border-gray-300 dark:border-gray-600 p-1">39% - 50%</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 dark:border-gray-600 p-1">8 年</td>
                  <td className="border border-gray-300 dark:border-gray-600 p-1">~20%</td>
                  <td className="border border-gray-300 dark:border-gray-600 p-1">~80%</td>
                  <td className="border border-gray-300 dark:border-gray-600 p-1">~25%</td>
                  <td className="border border-gray-300 dark:border-gray-600 p-1">~75%</td>
                </tr>
              </tbody>
            </table>
            <p className="font-medium">统计来源</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>中国汽车流通协会 + 精真估：《中国汽车保值率研究报告》</li>
              <li>58 汽车研究院：《2024 中国汽车保值率研究报告》</li>
              <li>天天拍车：《2025 二手车年度研究报告》</li>
              <li>iSeeCars（美国）：Vehicle Depreciation Study（样本量 110 万+）</li>
            </ul>
            <p className="font-medium">关键结论</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>3 年内：电动车折旧比燃油车高约 5–10 个百分点</li>
              <li>5 年后：差距缩小，但电动车仍低约 10–15 个百分点</li>
              <li>8 年期：电动车残值约 20%，燃油车约 25%，差距趋稳</li>
              <li>头部新能源品牌（如特斯拉、比亚迪）保值率接近燃油车平均水平</li>
            </ul>
            <p className="text-gray-500 dark:text-gray-400">
              以上为行业平均值参考，实际残值受品牌、车型、地区、新车降价、电池质保等因素影响，建议结合具体车型二手车挂牌价综合判断。
            </p>
          </div>
        ),
      },
    ]}
  />
);

const Home = () => {
  const [form] = Form.useForm<FormValues>();

  const formValues = useWatch([], form) as FormValues | undefined;

  const result = useMemo(() => {
    const vals = formValues as Partial<FormValues> | undefined;
    if (!vals || typeof vals !== "object") return null;
    const price = vals.price ?? DEFAULT_PRICE;
    const r3 = vals.depreciationRate3 ?? DEFAULT_RATE_3;
    const r5 = vals.depreciationRate5 ?? DEFAULT_RATE_5;
    const r8 = vals.depreciationRate8 ?? DEFAULT_RATE_8;
    const ins = vals.insuranceFirstYear ?? DEFAULT_INSURANCE;
    const initialOneTimeFee = vals.initialOneTimeFee ?? DEFAULT_INITIAL_ONE_TIME_FEE;
    const mileage = vals.mileagePerYear ?? DEFAULT_MILEAGE;
     const parkingFeePerYear = vals.parkingFeePerYear ?? DEFAULT_PARKING_FEE_PER_YEAR;
     const maintenanceFeePerYear = vals.maintenanceFeePerYear ?? DEFAULT_MAINTENANCE_FEE_PER_YEAR;
     const violationAccidentFeePerYear = vals.violationAccidentFeePerYear ?? DEFAULT_VIOLATION_ACCIDENT_FEE_PER_YEAR;
     const energyCostPerKm = vals.energyCostPerKm ?? DEFAULT_ENERGY_COST_PER_KM;
    if (price <= 0 || ins <= 0 || mileage <= 0) return null;
    if (r3 < 0 || r3 > 1 || r5 < 0 || r5 > 1 || r8 < 0 || r8 > 1) return null;
    return calcCarCost({
      price,
      depreciationRate3: r3,
      depreciationRate5: r5,
      depreciationRate8: r8,
      insuranceFirstYear: ins,
      mileagePerYear: mileage,
      parkingFeePerYear,
      maintenanceFeePerYear,
      violationAccidentFeePerYear,
      energyCostPerKm,
      purchaseTax: initialOneTimeFee,
    });
  }, [formValues]);

  const computedMonthlyOpEx = useMemo(() => {
    const vals = formValues as Partial<FormValues> | undefined;
    if (!vals || typeof vals !== "object") return 0;
    return calcMonthlyOpExFromAnnual({
      insuranceFirstYear: vals.insuranceFirstYear ?? DEFAULT_INSURANCE,
      parkingFeePerYear: vals.parkingFeePerYear ?? DEFAULT_PARKING_FEE_PER_YEAR,
      maintenanceFeePerYear: vals.maintenanceFeePerYear ?? DEFAULT_MAINTENANCE_FEE_PER_YEAR,
      violationAccidentFeePerYear:
        vals.violationAccidentFeePerYear ?? DEFAULT_VIOLATION_ACCIDENT_FEE_PER_YEAR,
      mileagePerYear: vals.mileagePerYear ?? DEFAULT_MILEAGE,
      energyCostPerKm: vals.energyCostPerKm ?? DEFAULT_ENERGY_COST_PER_KM,
    });
  }, [formValues]);

  const cashFlowResult = useMemo((): CarFinancialResult | null => {
    const vals = formValues as Partial<FormValues> | undefined;
    if (!vals || typeof vals !== "object") return null;
    const price = vals.price ?? DEFAULT_PRICE;
    const r3 = vals.depreciationRate3 ?? DEFAULT_RATE_3;
    const downPayment = vals.downPayment ?? DEFAULT_DOWN_PAYMENT;
    const initialOneTimeFee = vals.initialOneTimeFee ?? DEFAULT_INITIAL_ONE_TIME_FEE;
    const loanMonths = vals.loanMonths ?? DEFAULT_LOAN_MONTHS;
    const annualLoanRate = vals.annualLoanRate ?? DEFAULT_ANNUAL_LOAN_RATE;
    const marketReturnRate = vals.marketReturnRate ?? DEFAULT_MARKET_RETURN_RATE;
    const analysisYears = vals.analysisYears ?? DEFAULT_ANALYSIS_YEARS;
    const depreciationRate3 = r3;
    const depreciationRate5 = vals.depreciationRate5 ?? DEFAULT_RATE_5;
    const depreciationRate8 = vals.depreciationRate8 ?? DEFAULT_RATE_8;
    const residualRate = min(
      1,
      max(0, subtract(1, depreciationRate5) as number)
    ) as number;
    const optionCost = vals.optionCost ?? DEFAULT_OPTION_COST;
    const optionResidualRate = vals.optionResidualRate ?? DEFAULT_OPTION_RESIDUAL_RATE;
    if (
      price <= 0 ||
      downPayment < 0 ||
      initialOneTimeFee < 0 ||
      loanMonths < 0 ||
      computedMonthlyOpEx < 0 ||
      analysisYears < 1 ||
      optionCost < 0 ||
      (optionCost > 0 && (optionResidualRate < 0 || optionResidualRate > 1))
    )
      return null;
    const residualByYear = buildResidualByYearArray(
      price,
      depreciationRate3,
      depreciationRate5,
      depreciationRate8,
      analysisYears,
      optionCost,
      optionResidualRate
    );
    return calculateCarFinancial(
      {
        price,
        downPayment,
        taxAndInsurance: initialOneTimeFee,
        loanMonths,
        annualLoanRate,
        monthlyOpEx: computedMonthlyOpEx,
        residualRate,
        marketReturnRate,
        optionCost: optionCost > 0 ? optionCost : undefined,
        optionResidualRate: optionCost > 0 ? optionResidualRate : undefined,
        residualByYear,
      },
      analysisYears
    );
  }, [formValues, computedMonthlyOpEx]);

  const reportRef = useRef<HTMLDivElement>(null);
  const [isSavingReport, setIsSavingReport] = useState(false);
  const lineChartRef = useRef<HTMLDivElement>(null);
  const barChartRef = useRef<HTMLDivElement>(null);
  const isDark = useThemeStore((s) => s.isDark());

  const handleSaveReport = async () => {
    if (!reportRef.current) return;
    setIsSavingReport(true);
    await new Promise((r) => setTimeout(r, 200));
    try {
      const result = await snapdom(reportRef.current, {
        backgroundColor: isDark ? "#000000" : "#ffffff",
        width: 672, // 与 max-w-2xl 一致，避免截图时宽度收缩导致 suffix 换行
      });
      await result.download({
        filename: "car-cost-report.png",
      });
    } catch {
      // 忽略截图错误，避免打断用户操作
    } finally {
      setIsSavingReport(false);
    }
  };

  useEffect(() => {
    if (!lineChartRef.current || !cashFlowResult) return;
    const vals = formValues as Partial<FormValues> | undefined;
    const price = vals?.price ?? DEFAULT_PRICE;
    const depreciationRate3 = vals?.depreciationRate3 ?? DEFAULT_RATE_3;
    const depreciationRate5 = vals?.depreciationRate5 ?? DEFAULT_RATE_5;
    const depreciationRate8 = vals?.depreciationRate8 ?? DEFAULT_RATE_8;
    const analysisYears = vals?.analysisYears ?? DEFAULT_ANALYSIS_YEARS;
    const optionCost = vals?.optionCost ?? DEFAULT_OPTION_COST;
    const optionResidualRate = vals?.optionResidualRate ?? DEFAULT_OPTION_RESIDUAL_RATE;

    const chart = echarts.init(lineChartRef.current, isDark ? "dark" : undefined);
    const { series: s, summary } = cashFlowResult;
    const years = s.map((p) => p.year);
    const totalOutflow = s.map((p) => p.totalOutflow);
    const opportunityCostWealth = s.map((p) => p.opportunityCostWealth);
    const totalResidual = add(
      summary.vehicleResidual,
      summary.optionResidual
    ) as number;
    const residualLine = s.map(() => totalResidual);
    const residualByYear = buildResidualByYearArray(
      price,
      depreciationRate3,
      depreciationRate5,
      depreciationRate8,
      analysisYears,
      optionCost,
      optionResidualRate
    );
    const currentPeriodResidualLine = years.map((year) =>
      year >= 0 && year < residualByYear.length
        ? residualByYear[year]
        : residualByYear[residualByYear.length - 1] ?? 0
    );
    const netWealthLoss = s.map((p) => p.netWealthLoss);
    chart.setOption({
      tooltip: {
        trigger: "axis",
        valueFormatter: (value: number) =>
        `${round(divide(value, 10000), 2)} 万元`,
      },
      legend: {
        data: [
          "累计名义支出",
          "机会成本财富",
          "总残值（车辆+选配）",
          "当期卖出总残值（车辆+选配）",
          "净财富缩水",
        ],
        bottom: 0,
      },
      grid: { left: "3%", right: "4%", bottom: "15%", top: "10%", containLabel: true },
      xAxis: { type: "category", data: years, name: "年" },
      yAxis: {
        type: "value",
        name: "元",
        axisLabel: {
          formatter: (v: number) =>
            `${divide(Number(v), 10000)}万`,
        },
      },
      series: [
        { name: "累计名义支出", type: "line", data: totalOutflow, smooth: true },
        { name: "机会成本财富", type: "line", data: opportunityCostWealth, smooth: true },
        { name: "总残值（车辆+选配）", type: "line", data: residualLine, lineStyle: { type: "dashed" } },
        {
          name: "当期卖出总残值（车辆+选配）",
          type: "line",
          data: currentPeriodResidualLine,
          smooth: true,
        },
        { name: "净财富缩水", type: "line", data: netWealthLoss, smooth: true },
      ],
    });
    return () => {
      chart.dispose();
    };
  }, [cashFlowResult, formValues, isDark]);

  useEffect(() => {
    if (!barChartRef.current || !cashFlowResult) return;
    const chart = echarts.init(barChartRef.current, isDark ? "dark" : undefined);
    const vals = formValues as Partial<FormValues> | undefined;
    const downPayment = vals?.downPayment ?? DEFAULT_DOWN_PAYMENT;
    const initialOneTimeFee = vals?.initialOneTimeFee ?? DEFAULT_INITIAL_ONE_TIME_FEE;
    const analysisYears = vals?.analysisYears ?? DEFAULT_ANALYSIS_YEARS;
    const loanMonths = vals?.loanMonths ?? DEFAULT_LOAN_MONTHS;
    const totalLoan = multiply(
      cashFlowResult.monthlyPayment,
      min(loanMonths, multiply(analysisYears, 12) as number)
    ) as number;
    const totalOpEx = multiply(
      multiply(computedMonthlyOpEx, 12),
      analysisYears
    ) as number;
    const optionCost = vals?.optionCost ?? DEFAULT_OPTION_COST;
    const data = [
      { value: downPayment, name: "首付" },
      { value: initialOneTimeFee, name: "一次性费用" },
      ...(optionCost > 0 ? [{ value: optionCost, name: "选配" }] : []),
      { value: totalLoan, name: "月供总额" },
      { value: totalOpEx, name: "养车总额" },
    ].filter((d) => d.value > 0);
    chart.setOption({
      tooltip: {
        trigger: "item",
        valueFormatter: (value: number) =>
        `${round(divide(value, 10000), 2)} 万元`,
      },
      legend: { orient: "vertical", right: 10, top: "center" },
      series: [
        {
          type: "pie",
          radius: ["40%", "70%"],
          center: ["40%", "50%"],
          data,
          emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: "rgba(0,0,0,0.2)" } },
        },
      ],
    });
    return () => {
      chart.dispose();
    };
  }, [cashFlowResult, formValues, computedMonthlyOpEx, isDark]);

  return (
    <motion.div
      className="w-screen min-h-screen flex flex-col items-center justify-center p-4"
      initial={{ opacity: 0, filter: "blur(8px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, filter: "blur(8px)" }}
      transition={{ duration: 0.3 }}
    >
      <div ref={reportRef} className="max-w-2xl w-full">
        <Card className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <Typography.Title level={2} className="!mb-0">
              汽车综合使用成本计算器
            </Typography.Title>
            {!isSavingReport && (
              <Button type="primary" onClick={handleSaveReport}>
                保存报告为图片
              </Button>
            )}
          </div>

          <Form
            form={form}
            layout="vertical"
            initialValues={{
              price: DEFAULT_PRICE,
              depreciationRate3: DEFAULT_RATE_3,
              depreciationRate5: DEFAULT_RATE_5,
              depreciationRate8: DEFAULT_RATE_8,
              insuranceFirstYear: DEFAULT_INSURANCE,
              initialOneTimeFee: DEFAULT_INITIAL_ONE_TIME_FEE,
              mileagePerYear: DEFAULT_MILEAGE,
              parkingFeePerYear: DEFAULT_PARKING_FEE_PER_YEAR,
              maintenanceFeePerYear: DEFAULT_MAINTENANCE_FEE_PER_YEAR,
              violationAccidentFeePerYear: DEFAULT_VIOLATION_ACCIDENT_FEE_PER_YEAR,
              energyCostPerKm: DEFAULT_ENERGY_COST_PER_KM,
              downPayment: DEFAULT_DOWN_PAYMENT,
              loanMonths: DEFAULT_LOAN_MONTHS,
              annualLoanRate: DEFAULT_ANNUAL_LOAN_RATE,
              marketReturnRate: DEFAULT_MARKET_RETURN_RATE,
              analysisYears: DEFAULT_ANALYSIS_YEARS,
              optionCost: DEFAULT_OPTION_COST,
              optionResidualRate: DEFAULT_OPTION_RESIDUAL_RATE,
            }}
          >
          <Form.Item
            name="price"
            label="车价（元）"
            rules={[{ required: true, message: "请输入车价" }, { type: "number", min: 1, message: "车价须大于 0" }]}
          >
            <InputNumber style={{ width: INPUT_NUMBER_WIDTH }} min={1} suffix="元" />
          </Form.Item>
          <Form.Item
            name="depreciationRate3"
            label="3 年折旧率"
            rules={[
              { required: true, message: "请输入 3 年折旧率" },
              { type: "number", min: 0, max: 1, message: "折旧率须在 0–1 之间" },
            ]}
          >
            <InputNumber
              style={{ width: INPUT_NUMBER_WIDTH }}
              min={0}
              max={1}
              step={0.01}
              suffix="如 0.5 表示 50%"
            />
          </Form.Item>
          <Form.Item
            name="depreciationRate5"
            label="5 年折旧率"
            rules={[
              { required: true, message: "请输入 5 年折旧率" },
              { type: "number", min: 0, max: 1, message: "折旧率须在 0–1 之间" },
            ]}
          >
            <InputNumber
              style={{ width: INPUT_NUMBER_WIDTH }}
              min={0}
              max={1}
              step={0.01}
              suffix="如 0.6 表示 60%"
            />
          </Form.Item>
          <Form.Item
            name="depreciationRate8"
            label="8 年折旧率"
            rules={[
              { required: true, message: "请输入 8 年折旧率" },
              { type: "number", min: 0, max: 1, message: "折旧率须在 0–1 之间" },
            ]}
          >
            <InputNumber
              style={{ width: INPUT_NUMBER_WIDTH }}
              min={0}
              max={1}
              step={0.01}
              suffix="如 0.8 表示 80%"
            />
          </Form.Item>
          <div className="mb-4">
            <DepreciationHint />
          </div>
          <Form.Item
            name="insuranceFirstYear"
            label="首年保险（元）"
            rules={[{ required: true, message: "请输入首年保险" }, { type: "number", min: 0, message: "不能为负" }]}
          >
            <InputNumber style={{ width: INPUT_NUMBER_WIDTH }} min={0} suffix="元" />
          </Form.Item>
          <Form.Item
            name="initialOneTimeFee"
            label="购置税、上牌、等一次性支出（元）"
            rules={[{ type: "number", min: 0, message: "不能为负" }]}
            extra="购置税、上牌等一次性费用（不含首年保险）。该项会同时用于上方综合成本与下方现金流/机会成本分析，无需在其他地方重复填写。"
          >
            <InputNumber style={{ width: INPUT_NUMBER_WIDTH }} min={0} suffix="元" />
          </Form.Item>
          <Form.Item
            name="mileagePerYear"
            label="年里程（公里）"
            rules={[{ required: true, message: "请输入年里程" }, { type: "number", min: 1, message: "年里程须大于 0" }]}
          >
            <InputNumber style={{ width: INPUT_NUMBER_WIDTH }} min={1} suffix="公里" />
          </Form.Item>
          <Form.Item
            name="energyCostPerKm"
            label="每公里能源费用"
            rules={[{ type: "number", min: 0, message: "不能为负" }]}
            extra="仅供参考：油车约 0.5～0.9 元/公里，电车约 0.1～0.25 元/公里。"
          >
            <InputNumber
              style={{ width: INPUT_NUMBER_WIDTH }}
              min={0}
              step={0.01}
              suffix="元/公里"
            />
          </Form.Item>
          <Form.Item
            name="parkingFeePerYear"
            label="年停车费（元/年）"
            rules={[{ type: "number", min: 0, message: "不能为负" }]}
          >
            <InputNumber style={{ width: INPUT_NUMBER_WIDTH }} min={0} suffix="元/年" />
          </Form.Item>
          <Form.Item
            name="maintenanceFeePerYear"
            label="年保养费（元/年）"
            rules={[{ type: "number", min: 0, message: "不能为负" }]}
          >
            <InputNumber style={{ width: INPUT_NUMBER_WIDTH }} min={0} suffix="元/年" />
          </Form.Item>
          <Form.Item
            name="violationAccidentFeePerYear"
            label="年事故违章费（元/年）"
            rules={[{ type: "number", min: 0, message: "不能为负" }]}
          >
            <InputNumber style={{ width: INPUT_NUMBER_WIDTH }} min={0} suffix="元/年" />
          </Form.Item>

          <div className="mb-4 mt-6">
            <Typography.Title level={5}>现金流与机会成本参数（贷款、复利、残值）</Typography.Title>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              残值率由上方「5 年折旧率」自动推导（约等于 1 - 5 年折旧率），即使分析年数不是 5 年，也统一按这一期末残值率估算，无需单独填写。
            </p>
            <Form.Item
              name="downPayment"
              label="首付（元）"
              rules={[{ required: true }, { type: "number", min: 0 }]}
            >
              <InputNumber style={{ width: INPUT_NUMBER_WIDTH }} min={0} suffix="元" />
            </Form.Item>
            <Form.Item
              name="optionCost"
              label="选配费用（元）"
              rules={[{ type: "number", min: 0 }]}
              extra="购车时一次性支付。选配保值率多数低于车体，下方可单独填选配残值率。"
            >
              <InputNumber style={{ width: INPUT_NUMBER_WIDTH }} min={0} suffix="元" />
            </Form.Item>
            <Form.Item
              name="optionResidualRate"
              label="选配残值率（0~1）"
              rules={[{ type: "number", min: 0, max: 1 }]}
              extra="选配在分析期末的残值率，多数低于车辆本身，可填 0.15~0.25。"
            >
              <InputNumber
                style={{ width: INPUT_NUMBER_WIDTH }}
                min={0}
                max={1}
                step={0.01}
                suffix="如 0.2 即 20%"
              />
            </Form.Item>
            <Form.Item
              name="loanMonths"
              label="贷款月数"
              rules={[{ required: true }, { type: "number", min: 0 }]}
            >
              <InputNumber style={{ width: INPUT_NUMBER_WIDTH }} min={0} suffix="月" />
            </Form.Item>
            <Form.Item
              name="annualLoanRate"
              label="贷款年化利率"
              rules={[{ required: true }, { type: "number", min: 0 }]}
            >
              <InputNumber
                style={{ width: INPUT_NUMBER_WIDTH }}
                min={0}
                step={0.01}
                suffix="如 0.03 即 3%"
              />
            </Form.Item>
            <Form.Item
              label="月均养车费（元）"
              extra={MONTHLY_OPEX_CALC_DESCRIPTION}
            >
              <span className="text-base">
                {formatMoney(computedMonthlyOpEx)} 元
                <span className="ml-2 text-gray-500 dark:text-gray-400 text-sm">（自动计算）</span>
              </span>
            </Form.Item>
            <Form.Item
              name="marketReturnRate"
              label="理财年化收益率（机会成本）"
              extra={
                <div className="text-gray-500 dark:text-gray-400 text-sm space-y-0.5">
                  <div>参考：定投纳斯达克100 近10年年化约 12%</div>
                  <div>参考：定投红利低波 ETF 近10年年化约 8%</div>
                  <div>以上为历史收益率，仅供参考，不代表未来表现，建议按保守预期填写。</div>
                </div>
              }
              rules={[{ required: true }, { type: "number", min: 0 }]}
            >
              <InputNumber
                style={{ width: INPUT_NUMBER_WIDTH }}
                min={0}
                step={0.01}
                suffix="如 0.04 即 4%"
              />
            </Form.Item>
            <Form.Item
              name="analysisYears"
              label="分析年数"
              rules={[{ required: true }, { type: "number", min: 1 }]}
              extra="8 年后残值继续衰减（每年约 1.5%），最低约 3%（报废价格，新能源车约 5000-8000 元）。"
            >
              <InputNumber style={{ width: INPUT_NUMBER_WIDTH }} min={1} suffix="年" />
            </Form.Item>
          </div>
          </Form>

          {result && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <Card size="small" title="3 年">
                <Statistic title="折旧额" value={formatMoney(result.period3.depreciation)} suffix="元" />
                <Statistic title="总保险" value={formatMoney(result.period3.totalInsurance)} suffix="元" />
                <Collapse
                  size="small"
                  items={[
                    {
                      key: "ins3",
                      label: "各年保费（NCD 递减）",
                      children: (
                        <div className="text-sm space-y-0.5">
                          {getAnnualPremiums(
                            (formValues?.insuranceFirstYear ?? DEFAULT_INSURANCE) as number,
                            3
                          ).map((p, i) => (
                            <div key={i}>
                              第 {i + 1} 年：{formatMoney(p)} 元
                            </div>
                          ))}
                        </div>
                      ),
                    },
                  ]}
                />
                <Statistic title="停车总额" value={formatMoney(result.period3.totalParking)} suffix="元" />
                <Statistic title="保养总额" value={formatMoney(result.period3.totalMaintenance)} suffix="元" />
                <Statistic title="事故违章总额" value={formatMoney(result.period3.totalViolationAccident)} suffix="元" />
                <Statistic title="能源总额" value={formatMoney(result.period3.totalEnergy)} suffix="元" />
                <Statistic title="综合成本" value={formatMoney(result.period3.totalCost)} suffix="元" />
                <Statistic title="总里程" value={formatMoney(result.period3.totalMileage)} suffix="公里" />
                <Statistic title="每公里成本" value={result.period3.costPerKm} suffix="元/公里" />
              </Card>
              <Card size="small" title="5 年">
                <Statistic title="折旧额" value={formatMoney(result.period5.depreciation)} suffix="元" />
                <Statistic title="总保险" value={formatMoney(result.period5.totalInsurance)} suffix="元" />
                <Collapse
                  size="small"
                  items={[
                    {
                      key: "ins5",
                      label: "各年保费（NCD 递减）",
                      children: (
                        <div className="text-sm space-y-0.5">
                          {getAnnualPremiums(
                            (formValues?.insuranceFirstYear ?? DEFAULT_INSURANCE) as number,
                            5
                          ).map((p, i) => (
                            <div key={i}>
                              第 {i + 1} 年：{formatMoney(p)} 元
                            </div>
                          ))}
                        </div>
                      ),
                    },
                  ]}
                />
                <Statistic title="停车总额" value={formatMoney(result.period5.totalParking)} suffix="元" />
                <Statistic title="保养总额" value={formatMoney(result.period5.totalMaintenance)} suffix="元" />
                <Statistic title="事故违章总额" value={formatMoney(result.period5.totalViolationAccident)} suffix="元" />
                <Statistic title="能源总额" value={formatMoney(result.period5.totalEnergy)} suffix="元" />
                <Statistic title="综合成本" value={formatMoney(result.period5.totalCost)} suffix="元" />
                <Statistic title="总里程" value={formatMoney(result.period5.totalMileage)} suffix="公里" />
                <Statistic title="每公里成本" value={result.period5.costPerKm} suffix="元/公里" />
              </Card>
              <Card size="small" title="8 年">
                <Statistic title="折旧额" value={formatMoney(result.period8.depreciation)} suffix="元" />
                <Statistic title="总保险" value={formatMoney(result.period8.totalInsurance)} suffix="元" />
                <Collapse
                  size="small"
                  items={[
                    {
                      key: "ins8",
                      label: "各年保费（NCD 递减）",
                      children: (
                        <div className="text-sm space-y-0.5">
                          {getAnnualPremiums(
                            (formValues?.insuranceFirstYear ?? DEFAULT_INSURANCE) as number,
                            8
                          ).map((p, i) => (
                            <div key={i}>
                              第 {i + 1} 年：{formatMoney(p)} 元
                            </div>
                          ))}
                        </div>
                      ),
                    },
                  ]}
                />
                <Statistic title="停车总额" value={formatMoney(result.period8.totalParking)} suffix="元" />
                <Statistic title="保养总额" value={formatMoney(result.period8.totalMaintenance)} suffix="元" />
                <Statistic title="事故违章总额" value={formatMoney(result.period8.totalViolationAccident)} suffix="元" />
                <Statistic title="能源总额" value={formatMoney(result.period8.totalEnergy)} suffix="元" />
                <Statistic title="综合成本" value={formatMoney(result.period8.totalCost)} suffix="元" />
                <Statistic title="总里程" value={formatMoney(result.period8.totalMileage)} suffix="公里" />
                <Statistic title="每公里成本" value={result.period8.costPerKm} suffix="元/公里" />
              </Card>
            </div>
          )}

          {cashFlowResult && (
            <div className="mt-6 space-y-4">
              <Typography.Title level={5}>现金流与机会成本汇总</Typography.Title>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card size="small">
                  <Statistic
                    title="账面总支出"
                    value={formatMoney(cashFlowResult.summary.totalOutflow)}
                    suffix="元"
                  />
                  <Statistic
                    title="车辆残值"
                    value={formatMoney(cashFlowResult.summary.vehicleResidual)}
                    suffix="元"
                  />
                  <Statistic
                    title="选配残值"
                    value={formatMoney(cashFlowResult.summary.optionResidual)}
                    suffix="元"
                  />
                  <div>
                    <Statistic
                      title="总残值（车辆+选配）"
                      value={formatMoney(
                        add(
                          cashFlowResult.summary.vehicleResidual,
                          cashFlowResult.summary.optionResidual
                        ) as number
                      )}
                      suffix="元"
                    />
                    <Typography.Text type="secondary" className="text-xs">
                      分析期末卖车可收回的金额
                    </Typography.Text>
                  </div>
                  <Statistic
                    title="错失的利息（机会成本）"
                    value={formatMoney(cashFlowResult.summary.lostInvestmentGain)}
                    suffix="元"
                  />
                  <Statistic
                    title="净财富缩水"
                    value={formatMoney(cashFlowResult.summary.netWealthImpact)}
                    suffix="元"
                  />
                  {cashFlowResult.summary.loanRemainingAtEnd > 0 && (
                    <Typography.Text type="secondary" className="text-xs">
                      其中未还贷款 ¥{formatMoney(cashFlowResult.summary.loanRemainingAtEnd)}
                    </Typography.Text>
                  )}
                  <Statistic
                    title="期末卖车可得"
                    value={formatMoney(cashFlowResult.summary.totalResidualAtEnd)}
                    suffix="元"
                  />
                  <Typography.Text type="secondary" className="text-xs">
                    车辆 ¥{formatMoney(cashFlowResult.summary.vehicleResidual)}
                    {cashFlowResult.summary.optionResidual > 0 &&
                      ` + 选配 ¥${formatMoney(cashFlowResult.summary.optionResidual)}`}
                  </Typography.Text>
                </Card>
                <Card size="small">
                  <Statistic
                    title="年均持车成本"
                    value={formatMoney(cashFlowResult.efficiency.annualCost)}
                    suffix="元/年"
                  />
                  <Statistic
                    title="月均持车成本"
                    value={formatMoney(cashFlowResult.efficiency.monthlyCost)}
                    suffix="元/月"
                  />
                </Card>
              </div>
              <div>
                <Typography.Title level={5}>现金流与财富随时间变化</Typography.Title>
                <div className="mb-2 text-sm space-y-1">
                  <Typography.Text type="secondary" className="block">
                    <Typography.Text strong>「总残值（车辆+选配）」</Typography.Text>
                    ：表示在分析期<span className="underline decoration-dotted">最后一年</span>卖车可收回的金额，因此对应图中的一条水平线。
                  </Typography.Text>
                  <Typography.Text type="secondary" className="block">
                    <Typography.Text strong>「当期卖出总残值（车辆+选配）」</Typography.Text>
                    ：表示在<span className="underline decoration-dotted">每个年份末</span>立刻卖车可收回的金额，随年份增加而递减（车辆持续折旧）。
                  </Typography.Text>
                  <Typography.Text type="secondary" className="block">
                    <Typography.Text strong>「净财富缩水」</Typography.Text>
                    ：用一个更严谨的方式衡量“买车占用资金”的代价。
                    <br />
                    ≈「假设不买车而是把同样的钱全部拿去理财，在该年末本应拥有的财富」
                    <br />
                    减去「在该年末卖车后实际能留下的净资产（当期卖出总残值 − 剩余贷款本金）」。
                    <br />
                    为便于比较，这是一个理想化模型，假设每一笔购车相关支出都能在当期立刻按该理财收益率投入并持续复利。
                  </Typography.Text>
                </div>
                <div ref={lineChartRef} style={{ height: 320 }} />
              </div>
              <div>
                <Typography.Title level={5}>支出构成</Typography.Title>
                <div ref={barChartRef} style={{ height: 320 }} />
              </div>
            </div>
          )}
        </Card>
      </div>
    </motion.div>
  );
};

export default Home;
