import { motion } from "motion/react";
import { Card, Collapse, Form, InputNumber, Statistic, Typography } from "antd";
import { useWatch } from "antd/es/form/Form";
import { useMemo } from "react";
import { calcCarCost } from "@/utils/carCost";

const DEFAULT_PRICE = 253900;
const DEFAULT_RATE_3 = 0.5;
const DEFAULT_RATE_5 = 0.6;
const DEFAULT_RATE_8 = 0.8;
const DEFAULT_INSURANCE = 7000;
const DEFAULT_MILEAGE = 12000;

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

  return (
    <motion.div
      className="w-screen min-h-screen flex flex-col items-center justify-center p-4"
      initial={{ opacity: 0, filter: "blur(8px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, filter: "blur(8px)" }}
      transition={{ duration: 0.3 }}
    >
      <Card className="max-w-2xl w-full">
        <Typography.Title level={2} className="!mb-4">
          汽车综合使用成本计算器
        </Typography.Title>

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

      </Card>
    </motion.div>
  );
};

export default Home;
