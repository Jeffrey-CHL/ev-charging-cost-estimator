// src/App.tsx
// 这个文件是整个应用的主要组件，负责：
// 1. 展示页面结构（表单 + 结果展示）
// 2. 管理用户输入的状态（电池容量、电价、起始/结束电量、目标货币）
// 3. 调用外部汇率 API（open.er-api.com），把费用从 USD 换算到其他货币
// 4. 做基础输入校验 + 错误提示

import React, { useState } from "react"; // 引入 React 和 useState Hook
import "./App.css"; // 引入样式文件

// 定义支持的货币类型（联合类型）
// 这样可以限制 targetCurrency 只能是这些值，方便 TypeScript 做检查
type CurrencyCode = "USD" | "CNY" | "EUR" | "JPY" | "GBP";

// 定义从 open.er-api.com 返回的数据结构（只写我们需要用到的字段即可）
interface ExchangeRateResponse {
  result: string; // "success" 或 "error"
  base_code: string; // 这里一般是 "USD"
  rates: {
    [currencyCode: string]: number; // 不同币种的汇率，例如 rates["CNY"]
  };
}

// 定义表单中所有用户输入的数据结构
interface FormData {
  batteryCapacityKWh: number; // 电池总容量（单位：kWh）
  startPercentage: number;    // 起始电量（百分比 0-100）
  endPercentage: number;      // 目标电量（百分比 0-100）
  pricePerKWhUSD: number;     // 每度电价格（美元 USD/kWh）
  targetCurrency: CurrencyCode; // 目标货币，例如 "CNY"
}

// 定义计算结果的数据结构
interface CalculationResult {
  energyNeededKWh: number;        // 需要补的电量（kWh）
  costInUSD: number;              // 以 USD 计价的费用
  costInTargetCurrency: number;   // 换算成目标货币后的费用
  exchangeRate: number;           // 1 USD → 目标货币 的汇率
}

// 使用 React.FC 声明一个函数组件 App
const App: React.FC = () => {
  // formData：保存用户在表单里的所有输入
  // setFormData：更新 formData 的函数
  const [formData, setFormData] = useState<FormData>({
    batteryCapacityKWh: 75,   // 默认 75kWh，比如 Model Y LR
    startPercentage: 10,      // 默认从 10%
    endPercentage: 80,        // 默认充到 80%
    pricePerKWhUSD: 0.28,     // 默认电价 0.28 美元/度（可以改成你家电价）
    targetCurrency: "USD",    // 默认目标货币是 USD
  });

  // result：保存一次计算的结果，初始为 null（还没计算时）
  const [result, setResult] = useState<CalculationResult | null>(null);

  // isLoading：是否正在请求汇率 API，用于控制“计算中...”状态
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // errorMessage：错误信息（输入错误、API 失败等），初始为 null
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 支持的货币列表，用于渲染 <select> 下拉框
  const supportedCurrencies: CurrencyCode[] = ["USD", "CNY", "EUR", "JPY", "GBP"];

  // 通用的表单输入变化处理函数
  // 对于 input 和 select 都适用
  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    // 从事件对象中解构出 name 和 value
    const { name, value } = event.target;

    // 更新状态要使用 setFormData，并且拿到之前的值 prev
    setFormData((prev) => {
      // 如果是选择目标货币（下拉框），直接用字符串
      if (name === "targetCurrency") {
        return {
          ...prev, // 先把之前的字段展开
          targetCurrency: value as CurrencyCode, // 强制断言为 CurrencyCode
        };
      }

      // 其他字段都是 number 类型，这里用 parseFloat 转成 number
      return {
        ...prev,
        [name]: parseFloat(value),
      } as FormData;
    });
  };

  // 表单提交时触发的函数：负责计算 + 调用汇率 API
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    // 阻止表单默认提交行为（防止页面刷新）
    event.preventDefault();

    // 每次计算前先清空错误和旧结果
    setErrorMessage(null);
    setResult(null);

    // 从 formData 中解构出各个字段
    const {
      batteryCapacityKWh,
      startPercentage,
      endPercentage,
      pricePerKWhUSD,
      targetCurrency,
    } = formData;

    // 1. 基础输入校验：防止不合理的输入
    if (
      batteryCapacityKWh <= 0 ||
      startPercentage < 0 ||
      startPercentage > 100 ||
      endPercentage < 0 ||
      endPercentage > 100 ||
      pricePerKWhUSD <= 0
    ) {
      setErrorMessage("请输入有效的数值（电池容量 > 0，电量在 0-100 之间，电价 > 0）。");
      return; // 提前结束函数
    }

    // 结束电量必须大于起始电量
    if (endPercentage <= startPercentage) {
      setErrorMessage("结束电量必须大于起始电量，例如从 10% 充到 80%。");
      return;
    }

    // 2. 计算需要补充的电量（kWh）
    //    公式：电池容量 * (目标 SOC - 当前 SOC) / 100
    const deltaPercentage = endPercentage - startPercentage; // 百分比差值
    const energyNeededKWh =
      (batteryCapacityKWh * deltaPercentage) / 100; // 需要补的 kWh

    // 3. 计算以美元计价的费用：kWh * 单价
    const costInUSD = energyNeededKWh * pricePerKWhUSD;

    // 4. 调用汇率 API，把 USD 换算成目标货币
    //    这里使用 open.er-api.com 这个真正免费的汇率 API（不需要 key）
    setIsLoading(true); // 开始加载，按钮会变成“计算中...”

    try {
      // ✅ 使用新的免费汇率 API（不需要 access_key）
      const apiUrl = "https://open.er-api.com/v6/latest/USD";

      // 使用 fetch 发送 GET 请求
      const response = await fetch(apiUrl);

      // 如果 HTTP 状态码不是 200-299，认为请求失败
      if (!response.ok) {
        throw new Error(`API 请求失败，状态码：${response.status}`);
      }

      // 把响应体解析成 JSON，指定为 ExchangeRateResponse 类型
      const data: ExchangeRateResponse = await response.json();

      // 确认 result 是 "success"
      if (data.result !== "success") {
        throw new Error("汇率 API 返回错误结果。");
      }

      // 从返回数据中取出目标货币对应的汇率
      const exchangeRate = data.rates[targetCurrency];

      // 如果没有拿到汇率，也认为是失败
      if (!exchangeRate) {
        throw new Error("未从汇率 API 中获取到有效的数据。");
      }

      // 根据汇率计算目标货币的费用
      const costInTargetCurrency = costInUSD * exchangeRate;

      // 把所有结果保存到 result 状态中
      setResult({
        energyNeededKWh,
        costInUSD,
        costInTargetCurrency,
        exchangeRate,
      });
    } catch (error) {
      // 捕获异常（网络问题、解析错误等）
      console.error(error);
      setErrorMessage("获取汇率失败，请稍后重试，或检查网络连接。");
    } finally {
      // 不管成功失败，最后都要把 loading 状态设回 false
      setIsLoading(false);
    }
  };

  // JSX 返回页面 UI 结构
  return (
    // 最外层容器，用一个 div 包起来，设置 className 做样式
    <div className="app-root">
      {/* 页头区域，使用语义化标签 <header> */}
      <header className="app-header">
        <h1>EV 充电费用估算器</h1>
        <p className="app-subtitle">
          输入你的电动车电池信息和电价，我们会帮你估算从当前电量充到目标电量的大致费用，
          并支持多种货币显示（实时汇率）。
        </p>
      </header>

      {/* 页面主要内容区域，用 <main> 包裹 */}
      <main className="app-main">
        {/* 左侧卡片：输入表单区域，用 <section> 表示一个独立区块 */}
        <section className="card" aria-label="充电参数输入">
          <h2>输入充电参数</h2>
          {/* 表单，用 onSubmit 绑定 handleSubmit */}
          <form onSubmit={handleSubmit}>
            {/* 用 fieldset + legend 做分组，更语义化 */}
            <fieldset className="form-fieldset">
              <legend>电池参数</legend>

              {/* 电池容量输入行 */}
              <div className="form-row">
                <label htmlFor="batteryCapacityKWh">
                  电池总容量（kWh）
                </label>
                <input
                  id="batteryCapacityKWh"      // label 的 htmlFor 对应这个 id
                  name="batteryCapacityKWh"    // 对应 formData 的字段名
                  type="number"                // number 类型输入
                  min={1}                      // 最小值
                  step={0.1}                   // 步长
                  value={formData.batteryCapacityKWh} // 绑定当前值
                  onChange={handleInputChange}        // 输入变化时更新状态
                  required                              // 表示必填
                />
                <small className="field-hint">
                  例如 75 表示电池总容量为 75 kWh。
                </small>
              </div>

              {/* 起始电量输入行 */}
              <div className="form-row">
                <label htmlFor="startPercentage">
                  起始电量（%）
                </label>
                <input
                  id="startPercentage"
                  name="startPercentage"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={formData.startPercentage}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* 目标电量输入行 */}
              <div className="form-row">
                <label htmlFor="endPercentage">
                  目标电量（%）
                </label>
                <input
                  id="endPercentage"
                  name="endPercentage"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={formData.endPercentage}
                  onChange={handleInputChange}
                  required
                />
                <small className="field-hint">
                  例如从 10% 充到 80%，就填 10 和 80。
                </small>
              </div>
            </fieldset>

            {/* 电价 & 货币选择区域 */}
            <fieldset className="form-fieldset">
              <legend>电价与货币</legend>

              {/* 电价输入行 */}
              <div className="form-row">
                <label htmlFor="pricePerKWhUSD">
                  每度电价格（USD/kWh）
                </label>
                <input
                  id="pricePerKWhUSD"
                  name="pricePerKWhUSD"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.pricePerKWhUSD}
                  onChange={handleInputChange}
                  required
                />
                <small className="field-hint">
                  可输入你所在地区的大致电价，单位是美元/度。
                </small>
              </div>

              {/* 目标货币选择行 */}
              <div className="form-row">
                <label htmlFor="targetCurrency">
                  显示结果的货币
                </label>
                <select
                  id="targetCurrency"
                  name="targetCurrency"
                  value={formData.targetCurrency}
                  onChange={handleInputChange}
                >
                  {/* 遍历 supportedCurrencies 数组，生成 option */}
                  {supportedCurrencies.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </div>
            </fieldset>

            {/* 提交按钮，根据 isLoading 显示不同文字 */}
            <button
              type="submit"
              className="primary-button"
              disabled={isLoading}
            >
              {isLoading ? "计算中..." : "计算充电费用"}
            </button>

            {/* 如果有错误信息，就展示出来 */}
            {errorMessage && (
              <p className="error-message" role="alert">
                {errorMessage}
              </p>
            )}
          </form>
        </section>

        {/* 右侧卡片：结果展示区域 */}
        <section className="card" aria-label="估算结果">
          <h2>估算结果</h2>

          {/* 初始状态：还没有结果、没有错误、也没在 loading */}
          {!result && !isLoading && !errorMessage && (
            <p className="placeholder-text">
              请在左侧输入参数并点击“计算充电费用”，这里会显示结果。
            </p>
          )}

          {/* 加载状态 */}
          {isLoading && (
            <p className="placeholder-text">正在获取汇率并计算，请稍候...</p>
          )}

          {/* 有结果且不在加载中时展示结果详情 */}
          {result && !isLoading && (
            <div className="result-box">
              <p>
                需要补充的电量约为{" "}
                <strong>{result.energyNeededKWh.toFixed(2)} kWh</strong>。
              </p>
              <p>
                以电价 <strong>${formData.pricePerKWhUSD.toFixed(2)}</strong> USD/kWh 计算，
                本次充电大约需要{" "}
                <strong>${result.costInUSD.toFixed(2)} USD</strong>。
              </p>
              <p>
                当前汇率：1 USD ≈{" "}
                <strong>
                  {result.exchangeRate.toFixed(4)} {formData.targetCurrency}
                </strong>
              </p>
              <p>
                换算成{" "}
                <strong>{formData.targetCurrency}</strong>{" "}
                后，本次充电费用约为{" "}
                <strong>
                  {result.costInTargetCurrency.toFixed(2)}{" "}
                  {formData.targetCurrency}
                </strong>
                。
              </p>
              <p className="result-disclaimer">
                * 本工具仅用于粗略估算，实际费用会受到充电效率、电价波动、服务费等影响。
              </p>
            </div>
          )}
        </section>
      </main>

      {/* 页脚区域 */}
      <footer className="app-footer">
        <p>
          Made by a car & tech enthusiast · 汇率数据来自{" "}
          <a
            href="https://www.exchangerate-api.com/"
            target="_blank"
            rel="noreferrer"
          >
            exchangerate-api.com
          </a>
        </p>
      </footer>
    </div>
  );
};

// 导出 App 组件，供 index.tsx 使用
export default App;
