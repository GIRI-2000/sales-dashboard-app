import type {
  ActionItemRecord,
  SalesPlanRecord,
  ScenarioRecord,
} from '@rayfin-app/shared';

import { getRayfinClient } from '@/lib/rayfin-client';

/**
 * Typed access to the app's own Rayfin SQL tables.
 *
 * These are the records Power BI cannot store: plans people type in, saved
 * scenarios and follow-up actions. Reads are team-wide; writes are stamped
 * with the signed-in user's id and the server-side policy refuses edits to
 * anybody else's rows.
 */

export async function currentUser(): Promise<{ id: string; email: string }> {
  const client = await getRayfinClient();
  const session = client.auth.getSession();
  if (!session.isAuthenticated || !session.user) throw new Error('Not signed in.');
  return { id: session.user.id, email: session.user.email ?? '' };
}

interface Page<T> {
  items: T[];
  hasNextPage?: boolean;
  endCursor?: string | null;
}
interface Pageable<T> {
  after(cursor: string): Pageable<T>;
  executePaginated(): Promise<Page<T>>;
}

/** Page through a query until every row is read (execute() stops at 100). */
async function readAll<T>(build: () => Pageable<T>): Promise<T[]> {
  const out: T[] = [];
  let cursor: string | null | undefined;
  for (let i = 0; i < 100; i++) {
    const q = cursor ? build().after(cursor) : build();
    const page = await q.executePaginated();
    out.push(...page.items);
    if (!page.hasNextPage || !page.endCursor) break;
    cursor = page.endCursor;
  }
  return out;
}

const planFields = [
  'id', 'planYear', 'baseYear', 'region', 'category', 'baselineSales', 'plannedSales',
  'growthPct', 'status', 'note', 'owner_id', 'ownerEmail', 'updatedAt',
] as const;

export async function listPlans(planYear: number): Promise<SalesPlanRecord[]> {
  const client = await getRayfinClient();
  return readAll<SalesPlanRecord>(
    () =>
      client.data.SalesPlan.select([...planFields])
        .where({ planYear: { eq: planYear } })
        .orderBy({ updatedAt: 'desc' })
        .first(500) as unknown as Pageable<SalesPlanRecord>
  );
}

export async function createPlan(input: Omit<SalesPlanRecord, 'id'>) {
  const client = await getRayfinClient();
  return client.data.SalesPlan.create(input as never);
}

export async function updatePlan(id: string, patch: Partial<Omit<SalesPlanRecord, 'id'>>) {
  const client = await getRayfinClient();
  return client.data.SalesPlan.update({ id }, patch as never);
}

export async function deletePlan(id: string) {
  const client = await getRayfinClient();
  await client.data.SalesPlan.delete({ id });
}

const scenarioFields = [
  'id', 'name', 'baseYear', 'priceChangePct', 'discountChangePts', 'volumeChangePct',
  'costChangePct', 'elasticity', 'baselineSales', 'baselineProfit', 'projectedSales',
  'projectedProfit', 'note', 'owner_id', 'ownerEmail', 'createdAt',
] as const;

export async function listScenarios(): Promise<ScenarioRecord[]> {
  const client = await getRayfinClient();
  return readAll<ScenarioRecord>(
    () =>
      client.data.Scenario.select([...scenarioFields])
        .orderBy({ createdAt: 'desc' })
        .first(200) as unknown as Pageable<ScenarioRecord>
  );
}

export async function createScenario(input: Omit<ScenarioRecord, 'id'>) {
  const client = await getRayfinClient();
  return client.data.Scenario.create(input as never);
}

export async function deleteScenario(id: string) {
  const client = await getRayfinClient();
  await client.data.Scenario.delete({ id });
}

const actionFields = [
  'id', 'title', 'signalType', 'dimensionValue', 'impact', 'priority', 'status',
  'assignee', 'dueDate', 'notes', 'owner_id', 'ownerEmail', 'createdAt', 'updatedAt',
] as const;

export async function listActions(): Promise<ActionItemRecord[]> {
  const client = await getRayfinClient();
  return readAll<ActionItemRecord>(
    () =>
      client.data.ActionItem.select([...actionFields])
        .orderBy({ createdAt: 'desc' })
        .first(500) as unknown as Pageable<ActionItemRecord>
  );
}

export async function createAction(input: Omit<ActionItemRecord, 'id'>) {
  const client = await getRayfinClient();
  return client.data.ActionItem.create(input as never);
}

export async function updateAction(id: string, patch: Partial<Omit<ActionItemRecord, 'id'>>) {
  const client = await getRayfinClient();
  return client.data.ActionItem.update({ id }, patch as never);
}

export async function deleteAction(id: string) {
  const client = await getRayfinClient();
  await client.data.ActionItem.delete({ id });
}
