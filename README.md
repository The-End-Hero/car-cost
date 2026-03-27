# Car Cost Calculator

A comprehensive web application for calculating the true total cost of car ownership.

[![中文](https://img.shields.io/badge/-中文-red?style=flat-square)](README_zh.md)

---

## Features

### Cost Analysis
- **Comprehensive ownership costs** over 3, 5, and 8 year periods
- **Depreciation tracking** with EV and ICE vehicle reference data
- **Insurance calculation** with No-Claim Discount (NCD) progression
- **Energy cost tracking** for electricity/fuel
- **Cost per kilometer** breakdown

### Financial Analysis
- **Cash flow analysis** with detailed outflow tracking
- **Opportunity cost modeling** - compare purchase vs investment returns
- **Loan amortization** with equal installment calculations
- **Remaining loan balance** at end of analysis period
- **Net wealth impact** calculation

### Visualization
- **Wealth trajectory chart** - line chart showing financial position over time
- **Expense breakdown** - pie chart showing cost distribution
- **Report export** - save analysis as PNG image

---

## Tech Stack

| Category | Technology |
|----------------|-------------------|
| Framework | React 19, TypeScript, Vite |
| UI | Ant Design 6, Tailwind CSS 4, ECharts 6 |
| State | Zustand |
| Math | mathjs |
| Routing | React Router 7 |

---

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build
```

---

## Project Structure

```
src/
├── main.tsx              # Entry point
├── App.tsx               # Router setup
├── pages/home/
│   └── Home.tsx          # Main calculator UI
├── components/
│   ├── ThemeSwitch.tsx   # Dark/light mode toggle
│   └── Footer.tsx        # Footer
├── utils/
│   ├── carCost.ts        # Ownership cost calculator
│   └── carFinancialAnalyzer.ts  # Opportunity cost analyzer
└── providers/
    └── ThemeProvider.tsx # Theme configuration
```
