// src/App.tsx
// Main React component for the EV Charging Cost Estimator app.
// Responsibilities:
// 1. Render the form and the result section.
// 2. Manage user input state (battery capacity, start/end SOC, price, currency).
// 3. Call a free exchange-rate API (open.er-api.com) to convert USD cost to another currency.
// 4. Validate user input and show clear error messages when needed.

import React, { useState } from "react";
import "./App.css";

// Limit the allowed currency codes to a small, well-defined set.
// This helps TypeScript catch mistakes and keeps the UI simple.
type CurrencyCode = "USD" | "CNY" | "EUR" | "JPY" | "GBP";

// Shape of the response that we care about from open.er-api.com.
// The real API returns more fields, but we only need these.
interface ExchangeRateResponse {
  result: string; // "success" or "error"
  base_code: string; // Example: "USD"
  rates: {
    [currencyCode: string]: number; // Example: rates["CNY"] = 7.08
  };
}

// All form fields that the user can edit.
interface FormData {
  batteryCapacityKWh: number; // EV battery capacity in kWh
  startPercentage: number; // Starting state of charge (0–100)
  endPercentage: number; // Target state of charge (0–100)
  pricePerKWhUSD: number; // Electricity price in USD per kWh
  targetCurrency: CurrencyCode; // Currency for the final result
}

// Result of a successful calculation.
interface CalculationResult {
  energyNeededKWh: number; // Energy to be added (kWh)
  costInUSD: number; // Cost in USD
  costInTargetCurrency: number; // Cost converted into targetCurrency
  exchangeRate: number; // 1 USD → targetCurrency
}

const App: React.FC = () => {
  // User input state with sensible defaults.
  const [formData, setFormData] = useState<FormData>({
    batteryCapacityKWh: 75, // Example: 75 kWh battery (e.g., some EVs)
    startPercentage: 10, // Start at 10% SOC
    endPercentage: 80, // Charge up to 80% SOC
    pricePerKWhUSD: 0.28, // Example price: $0.28 per kWh
    targetCurrency: "USD", // Default result shown in USD
  });

  // Holds the last calculation result (or null if nothing calculated yet).
  const [result, setResult] = useState<CalculationResult | null>(null);

  // Indicates whether we are currently calling the exchange-rate API.
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Holds any validation or network error message to be shown to the user.
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Currency options for the dropdown.
  const supportedCurrencies: CurrencyCode[] = ["USD", "CNY", "EUR", "JPY", "GBP"];

  // Generic change handler for both <input> and <select>.
  // It updates the corresponding field in formData by using the "name" attribute.
  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;

    setFormData((prev) => {
      // For the currency dropdown, we keep the value as a string (CurrencyCode).
      if (name === "targetCurrency") {
        return {
          ...prev,
          targetCurrency: value as CurrencyCode,
        };
      }

      // For numeric fields, convert the string to a number.
      return {
        ...prev,
        [name]: parseFloat(value),
      } as FormData;
    });
  };

  // Called when the user submits the form.
  // It validates input, performs the cost calculation, then fetches the exchange rate.
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Prevents the page from reloading.

    // Clear previous state before a new calculation.
    setErrorMessage(null);
    setResult(null);

    const {
      batteryCapacityKWh,
      startPercentage,
      endPercentage,
      pricePerKWhUSD,
      targetCurrency,
    } = formData;

    // 1. Basic input validation.
    if (
      batteryCapacityKWh <= 0 ||
      startPercentage < 0 ||
      startPercentage > 100 ||
      endPercentage < 0 ||
      endPercentage > 100 ||
      pricePerKWhUSD <= 0
    ) {
      setErrorMessage(
        "Please enter valid values: battery capacity > 0, price > 0, and percentages between 0 and 100."
      );
      return;
    }

    if (endPercentage <= startPercentage) {
      setErrorMessage(
        "Target state of charge must be greater than the starting state of charge (e.g., from 10% to 80%)."
      );
      return;
    }

    // 2. Compute required energy in kWh.
    //    Formula: capacity (kWh) * (end% - start%) / 100.
    const deltaPercentage = endPercentage - startPercentage;
    const energyNeededKWh = (batteryCapacityKWh * deltaPercentage) / 100;

    // 3. Compute cost in USD.
    const costInUSD = energyNeededKWh * pricePerKWhUSD;

    // 4. Fetch exchange rate and convert to the target currency.
    setIsLoading(true);

    try {
      // Free, no-key exchange-rate API:
      // https://open.er-api.com/v6/latest/USD
      const apiUrl = "https://open.er-api.com/v6/latest/USD";

      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }

      // Parse the response as JSON and let TypeScript know its shape.
      const data: ExchangeRateResponse = await response.json();

      if (data.result !== "success") {
        throw new Error("Exchange rate API returned an error result.");
      }

      const exchangeRate = data.rates[targetCurrency];

      if (!exchangeRate) {
        throw new Error("Could not find a valid exchange rate for the selected currency.");
      }

      // Cost converted into the selected target currency.
      const costInTargetCurrency = costInUSD * exchangeRate;

      // Save the final result to state so it can be rendered.
      setResult({
        energyNeededKWh,
        costInUSD,
        costInTargetCurrency,
        exchangeRate,
      });
    } catch (error) {
      console.error(error);
      setErrorMessage("Failed to fetch exchange rates. Please try again later or check your network.");
    } finally {
      setIsLoading(false);
    }
  };

  // JSX: the actual UI of the app.
  return (
    <div className="app-root">
      {/* Header section */}
      <header className="app-header">
        <h1>EV Charging Cost Estimator</h1>
        <p className="app-subtitle">
          Enter your EV battery and electricity information to estimate the cost of charging
          from a starting state-of-charge (SoC) to a target SoC. Results can be shown in
          different currencies using live exchange rates.
        </p>
      </header>

      {/* Main content: left column = form, right column = results */}
      <main className="app-main">
        {/* Left: input form */}
        <section className="card" aria-label="Charging parameters input">
          <h2>Charging Parameters</h2>
          <form onSubmit={handleSubmit}>
            {/* Battery parameters */}
            <fieldset className="form-fieldset">
              <legend>Battery</legend>

              <div className="form-row">
                <label htmlFor="batteryCapacityKWh">Battery capacity (kWh)</label>
                <input
                  id="batteryCapacityKWh"
                  name="batteryCapacityKWh"
                  type="number"
                  min={1}
                  step={0.1}
                  value={formData.batteryCapacityKWh}
                  onChange={handleInputChange}
                  required
                />
                <small className="field-hint">
                  Example: 75 means a 75 kWh battery pack.
                </small>
              </div>

              <div className="form-row">
                <label htmlFor="startPercentage">Start state of charge (%)</label>
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

              <div className="form-row">
                <label htmlFor="endPercentage">Target state of charge (%)</label>
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
                  Example: charging from 10% to 80% → enter 10 and 80.
                </small>
              </div>
            </fieldset>

            {/* Price & currency */}
            <fieldset className="form-fieldset">
              <legend>Price & Currency</legend>

              <div className="form-row">
                <label htmlFor="pricePerKWhUSD">Electricity price (USD / kWh)</label>
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
                  Use an approximate price for your area in USD per kWh.
                </small>
              </div>

              <div className="form-row">
                <label htmlFor="targetCurrency">Show result in currency</label>
                <select
                  id="targetCurrency"
                  name="targetCurrency"
                  value={formData.targetCurrency}
                  onChange={handleInputChange}
                >
                  {supportedCurrencies.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </div>
            </fieldset>

            <button
              type="submit"
              className="primary-button"
              disabled={isLoading}
            >
              {isLoading ? "Calculating..." : "Estimate Charging Cost"}
            </button>

            {/* Error message, if any */}
            {errorMessage && (
              <p className="error-message" role="alert">
                {errorMessage}
              </p>
            )}
          </form>
        </section>

        {/* Right: results */}
        <section className="card" aria-label="Charging cost estimation result">
          <h2>Estimation Result</h2>

          {/* Initial state: nothing calculated yet */}
          {!result && !isLoading && !errorMessage && (
            <p className="placeholder-text">
              Fill out the form on the left and click &quot;Estimate Charging Cost&quot; to see the result here.
            </p>
          )}

          {/* Loading state */}
          {isLoading && (
            <p className="placeholder-text">Fetching exchange rates and calculating... Please wait.</p>
          )}

          {/* Final result */}
          {result && !isLoading && (
            <div className="result-box">
              <p>
                Estimated energy needed:{" "}
                <strong>{result.energyNeededKWh.toFixed(2)} kWh</strong>.
              </p>
              <p>
                With a price of{" "}
                <strong>${formData.pricePerKWhUSD.toFixed(2)} USD/kWh</strong>, the
                estimated charging cost is{" "}
                <strong>${result.costInUSD.toFixed(2)} USD</strong>.
              </p>
              <p>
                Current exchange rate: 1 USD ≈{" "}
                <strong>
                  {result.exchangeRate.toFixed(4)} {formData.targetCurrency}
                </strong>
              </p>
              <p>
                Converted to{" "}
                <strong>{formData.targetCurrency}</strong>, the estimated cost is{" "}
                <strong>
                  {result.costInTargetCurrency.toFixed(2)} {formData.targetCurrency}
                </strong>
                .
              </p>
              <p className="result-disclaimer">
                * This tool provides a rough estimate only. Actual cost can vary due to
                charging efficiency, time-of-use pricing, fees, and other factors.
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>
          Built as a demo EV tool · Exchange rate data from{" "}
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

export default App;
