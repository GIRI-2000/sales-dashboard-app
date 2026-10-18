# Sales Dashboard App: a Microsoft Fabric App with write-back

A Microsoft Fabric App (built with the Rayfin framework) on top of the existing **Interactive Sales Dashboard** Power BI semantic model. The Power BI report shows what happened. This app adds what a report cannot: people can **plan, simulate and act** on the same numbers, and their input is saved and shared.

📄 **Whitepaper:** [Fabric Apps: Bridging Data, Analytics and AI in a Single Ecosystem (PDF)](docs/Fabric-Apps-Whitepaper.pdf)

## What the app does

| Page | Purpose | Saves to the app database |
|---|---|---|
| **Pulse** | Live KPIs, monthly trend vs last year and target, team plan at a glance | — |
| **Plan Studio** | Collaborative sales forecast by region × category with draft/submit and team consensus (write-back) | SalesPlan |
| **Scenario Lab** | What-if levers (price, discount, volume, elasticity, cost) on real category economics | Scenario |
| **Action Board** | Signals detected from the model become owned, dated actions on a board | ActionItem |

## How it works

- **Read:** DAX queries run live against the semantic model through a read-only `fabric-semanticmodel` connector with delegated authentication, so each user's own permissions and row-level security apply. Figures match the Power BI report exactly.
- **Write:** user input is stored in a Fabric SQL database owned by the app. Every signed-in user can read all rows; only the owner can change their own rows, enforced on the server.
- **Host:** deployed as a protected Fabric App item; users sign in with their organisation account.

## Tech stack

Microsoft Fabric Apps (Rayfin CLI 1.36.2) · React 19 · TypeScript · Vite · DAX · Fabric SQL database · Vitest (61 tests). Built with AI assistance (Claude).

## Project structure

```
rayfin/rayfin.yml                 services and the semantic-model connector
packages/data/src/                SalesPlan, Scenario, ActionItem table definitions
packages/shared/src/              shared record types
packages/frontend/src/pages/      Pulse, PlanStudio, ScenarioLab, ActionBoard
packages/frontend/src/queries/    DAX queries (.dax)
```

## Run it yourself

The full step-by-step guide, from creating the Fabric App item to deployment, is in the [whitepaper](docs/Fabric-Apps-Whitepaper.pdf). In short:

```
npm install
npx rayfin login
npx rayfin up --workspace "<your workspace>" --item-name "<your app item>"
```

You need a Fabric workspace with the Fabric Apps workload and a published semantic model. Update the connector's workspace and model IDs in `rayfin/rayfin.yml` for your own model.

## Credits

- Sales data: practice dataset from a Udemy Power BI course, used for learning and demonstration only. Figures do not describe a real company.
- Project scaffold: Microsoft Rayfin `blankapp` template (MIT licence).

Author: U Giri Shankar
