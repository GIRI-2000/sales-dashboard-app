import { date, decimal, entity, int, role, text, uuid } from '@microsoft/rayfin-core';

/**
 * One planner's forecast for a Region x Category cell.
 *
 * Every signed-in user can read every plan (that is what makes the team
 * consensus view possible), but a row can only be created, changed or removed
 * by the person who owns it - enforced server side by the policy below.
 */
@entity()
@role('authenticated', 'read')
@role('authenticated', ['create', 'update', 'delete'], {
  policy: (claims, item) => claims.sub.eq(item.owner_id),
})
export class SalesPlan {
  @uuid() id!: string;
  @int() planYear!: number;
  @int() baseYear!: number;
  @text({ min: 1, max: 100 }) region!: string;
  @text({ min: 1, max: 100 }) category!: string;
  @decimal() baselineSales!: number;
  @decimal() plannedSales!: number;
  @decimal() growthPct!: number;
  @text({ max: 20, default: 'Draft' }) status!: string;
  @text({ optional: true, max: 500 }) note?: string;
  @text({ max: 200 }) owner_id!: string;
  @text({ max: 200 }) ownerEmail!: string;
  @date() updatedAt!: Date;
}
