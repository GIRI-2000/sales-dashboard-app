/**
 * Browser-safe record contracts shared by the data package and the frontend.
 * Keep each shape aligned with its decorated entity in `@rayfin-app/data`.
 */

/** A planner's forecast for one Region x Category cell of a plan year. */
export interface SalesPlanRecord {
  id: string;
  planYear: number;
  baseYear: number;
  region: string;
  category: string;
  baselineSales: number;
  plannedSales: number;
  growthPct: number;
  status: string; // 'Draft' | 'Submitted'
  note?: string | null;
  owner_id: string;
  ownerEmail: string;
  updatedAt: Date | string;
}

/** A saved what-if scenario computed from the semantic model baseline. */
export interface ScenarioRecord {
  id: string;
  name: string;
  baseYear: number;
  priceChangePct: number;
  discountChangePts: number;
  volumeChangePct: number;
  costChangePct: number;
  elasticity: number;
  baselineSales: number;
  baselineProfit: number;
  projectedSales: number;
  projectedProfit: number;
  note?: string | null;
  owner_id: string;
  ownerEmail: string;
  createdAt: Date | string;
}

/** A follow-up action raised from a signal detected in the semantic model. */
export interface ActionItemRecord {
  id: string;
  title: string;
  signalType: string; // 'Market decline' | 'Loss-making product' | 'Unhappy customer' | 'Manual'
  dimensionValue: string;
  impact: number;
  priority: string; // 'High' | 'Medium' | 'Low'
  status: string; // 'Open' | 'In progress' | 'Done'
  assignee?: string | null;
  dueDate?: Date | string | null;
  notes?: string | null;
  owner_id: string;
  ownerEmail: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type UniversalAppSchema = {
  SalesPlan: SalesPlanRecord;
  Scenario: ScenarioRecord;
  ActionItem: ActionItemRecord;
};
