import { date, decimal, entity, role, text, uuid } from '@microsoft/rayfin-core';

/** A follow-up action raised from a model signal. Team-readable, owner-editable. */
@entity()
@role('authenticated', 'read')
@role('authenticated', ['create', 'update', 'delete'], {
  policy: (claims, item) => claims.sub.eq(item.owner_id),
})
export class ActionItem {
  @uuid() id!: string;
  @text({ min: 1, max: 200 }) title!: string;
  @text({ max: 60 }) signalType!: string;
  @text({ max: 200 }) dimensionValue!: string;
  @decimal() impact!: number;
  @text({ max: 20 }) priority!: string;
  @text({ max: 20, default: 'Open' }) status!: string;
  @text({ optional: true, max: 200 }) assignee?: string;
  @date({ optional: true }) dueDate?: Date;
  @text({ optional: true, max: 1000 }) notes?: string;
  @text({ max: 200 }) owner_id!: string;
  @text({ max: 200 }) ownerEmail!: string;
  @date() createdAt!: Date;
  @date() updatedAt!: Date;
}
