# EV Charging Cost Estimator ⚡️🔋

A simple and user-friendly React + TypeScript application that estimates
EV charging costs based on battery size, electricity pricing, charging
percentage, and real-time currency exchange rates.

Live site: https://ev-charging-cost-estimator.netlify.app
GitHub repository: https://github.com/Jeffrey-CHL/ev-charging-cost-estimator

------------------------------------------------------------------------

## 📌 Overview

Electric vehicle owners often want a quick way to estimate how much it
will cost to charge their car from a given state-of-charge (SoC) to a
target SoC.\
This tool provides:

-   Estimated **energy needed (kWh)**
-   Charging cost in **USD**
-   Charging cost converted into **multiple currencies**
-   Real-time exchange rates from a **free API (open.er-api.com)**

The app is simple, fast, and accessible --- built as a small but
complete example of a real-world React + TypeScript web application.

------------------------------------------------------------------------

## 📝 PRD --- Product Requirement Document

### **1. Problem Statement**

EV drivers often need a quick estimation of charging costs based on
their battery capacity, local electricity price, and how much they plan
to charge.\
Existing tools are either too complex, require logins, or do not support
multi-currency results.

### **2. Goal**

Provide a lightweight, easy-to-use web tool that calculates:

-   Energy needed to charge from point A to B\
-   Charging cost in USD\
-   Charging cost converted into other major currencies

### **3. Target Users**

-   EV owners\
-   Potential EV buyers\
-   Students learning about energy consumption\
-   Anyone comparing charging costs across countries

### **4. User Value**

Users can instantly know:\
\> "How much will it cost to charge my EV from X% to Y%, using my
electricity rate, in my preferred currency?"

### **5. Functional Requirements**

-   User inputs battery capacity, start/end SOC, electricity rate,
    target currency\
-   Output includes required kWh, USD cost, exchange rate, and converted
    cost\
-   Fetch live exchange rates from open.er-api.com\
-   Validate all inputs

### **6. Technical Requirements**

-   React + TypeScript\
-   Semantic HTML\
-   Accessible CSS\
-   Hosted on Netlify\
-   Code on GitHub

------------------------------------------------------------------------

## 🛠️ Technology Stack

-   **React 18**
-   **TypeScript**
-   **CSS**
-   **open.er-api.com API**
-   **Netlify**
-   **GitHub**

------------------------------------------------------------------------

## ⚙️ How It Works

1.  User fills out the form.\
2.  App computes required energy and USD cost.\
3.  Fetches live exchange rate from API.\
4.  Converts USD → target currency.\
5.  Displays final results.

------------------------------------------------------------------------

## 🚀 Getting Started

### Clone repo

``` bash
git clone https://github.com/Jeffrey-CHL/ev-charging-cost-estimator.git
cd ev-charging-cost-estimator
```

### Install dependencies

``` bash
npm install
```

### Run locally

``` bash
npm start
```

------------------------------------------------------------------------

## 🌐 Deployment (Netlify)

1.  Add new site → Import Git repository\
2.  Build command:

```{=html}
<!-- -->
```
    npm run build

3.  Publish directory:

```{=html}
<!-- -->
```
    build

4.  Deploy\
5.  Netlify automatically redeploys on each git push

------------------------------------------------------------------------

## 🔗 API Used

Free, no-key API:

    GET https://open.er-api.com/v6/latest/USD

------------------------------------------------------------------------

## 📁 Project Structure

    ev-charging-cost-estimator/
    ├── public/
    ├── src/
    │   ├── App.tsx
    │   ├── App.css
    │   ├── index.tsx
    │
    ├── package.json
    ├── tsconfig.json
    └── README.md

------------------------------------------------------------------------

## 🧪 How to Use

1.  Enter battery capacity\
2.  Enter start/end SOC\
3.  Enter electricity price\
4.  Select currency\
5.  Click "Estimate Charging Cost"\
6.  View results

------------------------------------------------------------------------

## ✨ Author

Built by **Hanlin (Jeffrey) Cheng**, Northeastern University.

------------------------------------------------------------------------

## 📝 License

MIT License
