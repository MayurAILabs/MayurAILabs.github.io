# Mayur AI Labs

Landing page for [mayurailabs.github.io](https://mayurailabs.github.io) — a personal hub linking to a growing set of small, practical web apps.

**Tagline:** Small savings. Big future.

## Apps hosted here

| App | Description | Live URL | Repo |
|---|---|---|---|
| 💰 Daily Savings Calculator | Visualizes how small daily savings compound over time (₹/lakhs/crores, Chart.js) | [Open](https://mayurailabs.github.io/mayur-ai-labs-savings-calculator/) | [mayur-ai-labs-savings-calculator](https://github.com/MayurAILabs/mayur-ai-labs-savings-calculator) |
| 📊 Expense Manager | Tracks daily spending by category to show where money goes each month | [Open](https://mayurailabs.github.io/expense-tracker/) | [expense-tracker](https://github.com/MayurAILabs/expense-tracker) |
| ✅ Priority Manager | Priority-based task tracker with sign-in and role-based access | [Open](https://mayurailabs.github.io/PriorityManager/) | [PriorityManager](https://github.com/MayurAILabs/PriorityManager) |

## Structure

This repo (`MayurAILabs.github.io`) contains only the landing page (`index.html`). Each app above lives in its own repo and is deployed independently via GitHub Pages, so updates to one app never affect the others or this landing page.

```
MayurAILabs.github.io/
└── index.html   ← landing page (this repo)

mayur-ai-labs-savings-calculator/   ← separate repo, own Pages deployment
expense-tracker/                    ← separate repo, own Pages deployment
PriorityManager/                    ← separate repo, own Pages deployment
```

## Adding a new app

1. Build and deploy the new app in its own repo with GitHub Pages enabled (source: `main`, root).
2. Add a new card to `index.html` on this landing page with the app's name, a one-line description, and its live Pages URL.
3. Commit and push — the landing page updates immediately.

## Tech

Single-file `index.html`, vanilla HTML/CSS, dark navy + emerald theme, no build step, no dependencies.
