import { motion } from "motion/react";
import { Button, Card, Collapse, Form, InputNumber, Statistic, Typography } from "antd";
import { useWatch } from "antd/es/form/Form";
import { useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts";
import { useThemeStore } from "@/stores/theme";
import { calcCarCost } from "@/utils/carCost";
import {
  calculateCarFinancial,
  type CarFinancialResult,
} from "@/utils/carFinancialAnalyzer";
import { domToPng } from "modern-screenshot";

const DEFAULT_PRICE = 253900;
const DEFAULT_RATE_3 = 0.5;
const DEFAULT_RATE_5 = 0.6;
const DEFAULT_RATE_8 = 0.8;
const DEFAULT_INSURANCE = 7000;
const DEFAULT_MILEAGE = 12000;
const DEFAULT_DOWN_PAYMENT = 90000;
const DEFAULT_TAX_AND_INSURANCE = 30000;
const DEFAULT_LOAN_MONTHS = 36;
const DEFAULT_ANNUAL_LOAN_RATE = 0.03;
const DEFAULT_MONTHLY_OPEX = 2500;
const DEFAULT_MARKET_RETURN_RATE = 0.04;
const DEFAULT_ANALYSIS_YEARS = 5;
const DEFAULT_RESIDUAL_RATE = 0.4;
const DEFAULT_OPTION_COST = 0;
const DEFAULT_OPTION_RESIDUAL_RATE = 0.2;

function formatMoney(n: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

interface FormValues {
  price: number;
  depreciationRate3: number;
  depreciationRate5: number;
  depreciationRate8: number;
  insuranceFirstYear: number;
  mileagePerYear: number;
  downPayment: number;
  taxAndInsurance: number;
  loanMonths: number;
  annualLoanRate: number;
  monthlyOpEx: number;
  marketReturnRate: number;
  analysisYears: number;
  residualRate: number;
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
    const mileage = vals.mileagePerYear ?? DEFAULT_MILEAGE;
    if (price <= 0 || ins <= 0 || mileage <= 0) return null;
    if (r3 < 0 || r3 > 1 || r5 < 0 || r5 > 1 || r8 < 0 || r8 > 1) return null;
    return calcCarCost({
      price,
      depreciationRate3: r3,
      depreciationRate5: r5,
      depreciationRate8: r8,
      insuranceFirstYear: ins,
      mileagePerYear: mileage,
    });
  }, [formValues]);

  const cashFlowResult = useMemo((): CarFinancialResult | null => {
    const vals = formValues as Partial<FormValues> | undefined;
    if (!vals || typeof vals !== "object") return null;
    const price = vals.price ?? DEFAULT_PRICE;
    const downPayment = vals.downPayment ?? DEFAULT_DOWN_PAYMENT;
    const taxAndInsurance = vals.taxAndInsurance ?? DEFAULT_TAX_AND_INSURANCE;
    const loanMonths = vals.loanMonths ?? DEFAULT_LOAN_MONTHS;
    const annualLoanRate = vals.annualLoanRate ?? DEFAULT_ANNUAL_LOAN_RATE;
    const monthlyOpEx = vals.monthlyOpEx ?? DEFAULT_MONTHLY_OPEX;
    const marketReturnRate = vals.marketReturnRate ?? DEFAULT_MARKET_RETURN_RATE;
    const analysisYears = vals.analysisYears ?? DEFAULT_ANALYSIS_YEARS;
    const residualRate = vals.residualRate ?? DEFAULT_RESIDUAL_RATE;
    const optionCost = vals.optionCost ?? DEFAULT_OPTION_COST;
    const optionResidualRate = vals.optionResidualRate ?? DEFAULT_OPTION_RESIDUAL_RATE;
    if (
      price <= 0 ||
      downPayment < 0 ||
      taxAndInsurance < 0 ||
      loanMonths < 0 ||
      monthlyOpEx < 0 ||
      analysisYears < 1 ||
      residualRate < 0 ||
      residualRate > 1 ||
      optionCost < 0 ||
      (optionCost > 0 && (optionResidualRate < 0 || optionResidualRate > 1))
    )
      return null;
    return calculateCarFinancial(
      {
        price,
        downPayment,
        taxAndInsurance,
        loanMonths,
        annualLoanRate,
        monthlyOpEx,
        residualRate,
        marketReturnRate,
        optionCost: optionCost > 0 ? optionCost : undefined,
        optionResidualRate: optionCost > 0 ? optionResidualRate : undefined,
      },
      analysisYears
    );
  }, [formValues]);

  const reportRef = useRef<HTMLDivElement>(null);
  const saveReportBtnRef = useRef<HTMLButtonElement>(null);
  const lineChartRef = useRef<HTMLDivElement>(null);
  const barChartRef = useRef<HTMLDivElement>(null);
  const isDark = useThemeStore((s) => s.isDark());

  const handleSaveReport = async () => {
    if (!reportRef.current) return;
    const btn = saveReportBtnRef.current;
    if (btn) btn.style.visibility = "hidden";
    try {
      const dataUrl = await domToPng(reportRef.current, {
        backgroundColor: isDark ? "#000000" : "#ffffff",
      });
      const link = document.createElement("a");
      link.download = "car-cost-report.png";
      link.href = dataUrl;
      link.click();
    } catch {
      // 忽略截图错误，避免打断用户操作
    } finally {
      if (btn) btn.style.visibility = "";
    }
  };

  useEffect(() => {
    if (!lineChartRef.current || !cashFlowResult) return;
    const chart = echarts.init(lineChartRef.current, isDark ? "dark" : undefined);
    const { series: s, summary } = cashFlowResult;
    const years = s.map((p) => p.year);
    const totalOutflow = s.map((p) => p.totalOutflow);
    const opportunityCostWealth = s.map((p) => p.opportunityCostWealth);
    const totalResidual =
      summary.vehicleResidual + summary.optionResidual;
    const residualLine = s.map(() => totalResidual);
    const netWealthLoss = s.map((p) => p.netWealthLoss);
    chart.setOption({
      tooltip: {
        trigger: "axis",
        valueFormatter: (value: number) => `${(value / 10000).toFixed(2)} 万元`,
      },
      legend: { data: ["累计名义支出", "机会成本财富", "总残值（车辆+选配）", "净财富缩水"], bottom: 0 },
      grid: { left: "3%", right: "4%", bottom: "15%", top: "10%", containLabel: true },
      xAxis: { type: "category", data: years, name: "年" },
      yAxis: { type: "value", name: "元", axisLabel: { formatter: (v: number) => `${Number(v) / 10000}万` } },
      series: [
        { name: "累计名义支出", type: "line", data: totalOutflow, smooth: true },
        { name: "机会成本财富", type: "line", data: opportunityCostWealth, smooth: true },
        { name: "总残值（车辆+选配）", type: "line", data: residualLine, lineStyle: { type: "dashed" } },
        { name: "净财富缩水", type: "line", data: netWealthLoss, smooth: true },
      ],
    });
    return () => {
      chart.dispose();
    };
  }, [cashFlowResult, isDark]);

  useEffect(() => {
    if (!barChartRef.current || !cashFlowResult) return;
    const chart = echarts.init(barChartRef.current, isDark ? "dark" : undefined);
    const vals = formValues as Partial<FormValues> | undefined;
    const downPayment = vals?.downPayment ?? 0;
    const taxAndInsurance = vals?.taxAndInsurance ?? 0;
    const analysisYears = vals?.analysisYears ?? 5;
    const loanMonths = vals?.loanMonths ?? 36;
    const monthlyOpEx = vals?.monthlyOpEx ?? 0;
    const totalLoan = cashFlowResult.monthlyPayment * Math.min(loanMonths, analysisYears * 12);
    const totalOpEx = monthlyOpEx * 12 * analysisYears;
    const optionCost = vals?.optionCost ?? 0;
    const data = [
      { value: downPayment, name: "首付" },
      { value: taxAndInsurance, name: "税费杂费" },
      ...(optionCost > 0 ? [{ value: optionCost, name: "选配" }] : []),
      { value: totalLoan, name: "月供总额" },
      { value: totalOpEx, name: "养车总额" },
    ].filter((d) => d.value > 0);
    chart.setOption({
      tooltip: {
        trigger: "item",
        valueFormatter: (value: number) => `${(value / 10000).toFixed(2)} 万元`,
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
  }, [cashFlowResult, formValues, isDark]);

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
            <Button ref={saveReportBtnRef} type="primary" onClick={handleSaveReport}>
              保存报告为图片
            </Button>
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
              mileagePerYear: DEFAULT_MILEAGE,
              downPayment: DEFAULT_DOWN_PAYMENT,
              taxAndInsurance: DEFAULT_TAX_AND_INSURANCE,
              loanMonths: DEFAULT_LOAN_MONTHS,
              annualLoanRate: DEFAULT_ANNUAL_LOAN_RATE,
              monthlyOpEx: DEFAULT_MONTHLY_OPEX,
              marketReturnRate: DEFAULT_MARKET_RETURN_RATE,
              analysisYears: DEFAULT_ANALYSIS_YEARS,
              residualRate: DEFAULT_RESIDUAL_RATE,
              optionCost: DEFAULT_OPTION_COST,
              optionResidualRate: DEFAULT_OPTION_RESIDUAL_RATE,
            }}
          >
          <Form.Item
            name="price"
            label="车价（元）"
            rules={[{ required: true, message: "请输入车价" }, { type: "number", min: 1, message: "车价须大于 0" }]}
          >
            <InputNumber className="w-full" min={1} addonAfter="元" />
          </Form.Item>
          <Form.Item
            name="depreciationRate3"
            label="3 年折旧率"
            rules={[
              { required: true, message: "请输入 3 年折旧率" },
              { type: "number", min: 0, max: 1, message: "折旧率须在 0–1 之间" },
            ]}
          >
            <InputNumber className="w-full" min={0} max={1} step={0.01} addonAfter="如 0.5 表示 50%" />
          </Form.Item>
          <Form.Item
            name="depreciationRate5"
            label="5 年折旧率"
            rules={[
              { required: true, message: "请输入 5 年折旧率" },
              { type: "number", min: 0, max: 1, message: "折旧率须在 0–1 之间" },
            ]}
          >
            <InputNumber className="w-full" min={0} max={1} step={0.01} addonAfter="如 0.6 表示 60%" />
          </Form.Item>
          <Form.Item
            name="depreciationRate8"
            label="8 年折旧率"
            rules={[
              { required: true, message: "请输入 8 年折旧率" },
              { type: "number", min: 0, max: 1, message: "折旧率须在 0–1 之间" },
            ]}
          >
            <InputNumber className="w-full" min={0} max={1} step={0.01} addonAfter="如 0.8 表示 80%" />
          </Form.Item>
          <div className="mb-4">
            <DepreciationHint />
          </div>
          <Form.Item
            name="insuranceFirstYear"
            label="首年保险（元）"
            rules={[{ required: true, message: "请输入首年保险" }, { type: "number", min: 0, message: "不能为负" }]}
          >
            <InputNumber className="w-full" min={0} addonAfter="元" />
          </Form.Item>
          <Form.Item
            name="mileagePerYear"
            label="年里程（公里）"
            rules={[{ required: true, message: "请输入年里程" }, { type: "number", min: 1, message: "年里程须大于 0" }]}
          >
            <InputNumber className="w-full" min={1} addonAfter="公里" />
          </Form.Item>

          <div className="mb-4 mt-4">
            <Collapse
              items={[
                {
                  key: "cashflow",
                  label: "现金流与机会成本（贷款、复利、残值）",
                  children: (
                    <>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                        残值率 = 1 - 折旧率，可与上方「5 年折旧率」联动（5 年残值率 ≈ 1 - 5年折旧率）。
                      </p>
                      <Form.Item
                        name="downPayment"
                        label="首付（元）"
                        rules={[{ required: true }, { type: "number", min: 0 }]}
                      >
                        <InputNumber className="w-full" min={0} addonAfter="元" />
                      </Form.Item>
                      <Form.Item
                        name="taxAndInsurance"
                        label="购置税、首年保险等杂费（元）"
                        rules={[{ required: true }, { type: "number", min: 0 }]}
                      >
                        <InputNumber className="w-full" min={0} addonAfter="元" />
                      </Form.Item>
                      <Form.Item
                        name="optionCost"
                        label="选配费用（元）"
                        rules={[{ type: "number", min: 0 }]}
                        extra="购车时一次性支付。选配保值率多数低于车体，下方可单独填选配残值率。"
                      >
                        <InputNumber className="w-full" min={0} addonAfter="元" />
                      </Form.Item>
                      <Form.Item
                        name="optionResidualRate"
                        label="选配残值率（0~1）"
                        rules={[{ type: "number", min: 0, max: 1 }]}
                        extra="选配在 N 年后的残值率，多数低于车辆本身，可填 0.15~0.25。"
                      >
                        <InputNumber className="w-full" min={0} max={1} step={0.01} addonAfter="如 0.2 即 20%" />
                      </Form.Item>
                      <Form.Item
                        name="loanMonths"
                        label="贷款月数"
                        rules={[{ required: true }, { type: "number", min: 0 }]}
                      >
                        <InputNumber className="w-full" min={0} addonAfter="月" />
                      </Form.Item>
                      <Form.Item
                        name="annualLoanRate"
                        label="贷款年化利率"
                        rules={[{ required: true }, { type: "number", min: 0 }]}
                      >
                        <InputNumber className="w-full" min={0} step={0.01} addonAfter="如 0.03 即 3%" />
                      </Form.Item>
                      <Form.Item
                        name="monthlyOpEx"
                        label="月均养车费（元）"
                        rules={[{ required: true }, { type: "number", min: 0 }]}
                      >
                        <InputNumber className="w-full" min={0} addonAfter="元" />
                      </Form.Item>
                      <Form.Item
                        name="marketReturnRate"
                        label="理财年化收益率（机会成本）"
                        rules={[{ required: true }, { type: "number", min: 0 }]}
                      >
                        <InputNumber className="w-full" min={0} step={0.01} addonAfter="如 0.04 即 4%" />
                      </Form.Item>
                      <Form.Item
                        name="analysisYears"
                        label="分析年数"
                        rules={[{ required: true }, { type: "number", min: 1 }]}
                      >
                        <InputNumber className="w-full" min={1} addonAfter="年" />
                      </Form.Item>
                      <Form.Item
                        name="residualRate"
                        label="N 年后残值率（0~1）"
                        rules={[
                          { required: true },
                          { type: "number", min: 0, max: 1, message: "0~1 之间" },
                        ]}
                      >
                        <InputNumber className="w-full" min={0} max={1} step={0.01} addonAfter="如 0.4 即 40%" />
                      </Form.Item>
                    </>
                  ),
                },
              ]}
            />
            </div>
          </Form>

          {result && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <Card size="small" title="3 年">
                <Statistic title="折旧额" value={formatMoney(result.period3.depreciation)} suffix="元" />
                <Statistic title="总保险" value={formatMoney(result.period3.totalInsurance)} suffix="元" />
                <Statistic title="综合成本" value={formatMoney(result.period3.totalCost)} suffix="元" />
                <Statistic title="总里程" value={formatMoney(result.period3.totalMileage)} suffix="公里" />
                <Statistic title="每公里成本" value={result.period3.costPerKm} suffix="元/公里" />
              </Card>
              <Card size="small" title="5 年">
                <Statistic title="折旧额" value={formatMoney(result.period5.depreciation)} suffix="元" />
                <Statistic title="总保险" value={formatMoney(result.period5.totalInsurance)} suffix="元" />
                <Statistic title="综合成本" value={formatMoney(result.period5.totalCost)} suffix="元" />
                <Statistic title="总里程" value={formatMoney(result.period5.totalMileage)} suffix="公里" />
                <Statistic title="每公里成本" value={result.period5.costPerKm} suffix="元/公里" />
              </Card>
              <Card size="small" title="8 年">
                <Statistic title="折旧额" value={formatMoney(result.period8.depreciation)} suffix="元" />
                <Statistic title="总保险" value={formatMoney(result.period8.totalInsurance)} suffix="元" />
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
                  <Statistic
                    title="总残值（车辆+选配）"
                    value={formatMoney(
                      cashFlowResult.summary.vehicleResidual + cashFlowResult.summary.optionResidual
                    )}
                    suffix="元"
                  />
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
