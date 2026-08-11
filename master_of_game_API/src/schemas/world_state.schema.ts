import { z } from 'zod';

export const EventTierSchema = z.enum(['GLOBAL', 'REGIONAL', 'LOCAL']);
export const EventStatusSchema = z.enum(['ACTIVE', 'RESOLVED', 'INACTIVE']);

export const TimeStateSchema = z.object({
  current_date: z.string(), // ISO 8601 string, e.g. "1024-06-15T14:00:00.000Z"
  narrative_date: z.string(), // e.g. "15 Червня 1024 року (Літо)"
  is_night: z.boolean(),
});

export const WeatherTimelineItemSchema = z.object({
  from_hour: z.number().min(0).max(24),
  to_hour: z.number().min(0).max(24),
  condition: z.string(),
});

export const WeatherStateSchema = z.object({
  current_condition: z.string(),
  timeline: z.array(WeatherTimelineItemSchema),
});

export const WorldEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  tier: EventTierSchema,
  location_id: z.string().nullable().optional(),
  start_date: z.string(),
  status: EventStatusSchema,
  resolution_summary: z.string().nullable().optional(),
});

export const CalendarEventSchema = z.object({
  id: z.string(),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  title: z.string(),
  description: z.string(),
  tier: EventTierSchema.optional().default('GLOBAL'),
  location_id: z.string().nullable().optional(),
});

export const WorldStateSchema = z.object({
  time: TimeStateSchema,
  weather: WeatherStateSchema,
  events: z.array(WorldEventSchema),
});

// Tool Input Schemas

export const AdvanceTimeInputSchema = z.object({
  days: z.number().min(0).optional(),
  hours: z.number().min(0).optional(),
});

export const OverrideWeatherInputSchema = z.object({
  condition: z.string().min(1, 'Condition string cannot be empty'),
  from_hour: z.number().min(0).max(24),
  to_hour: z.number().min(0).max(24),
});

export const ManageEventActionSchema = z.enum(['create', 'update', 'resolve']);

export const ManageEventInputSchema = z.object({
  action: ManageEventActionSchema,
  event_id: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  tier: EventTierSchema.optional(),
  location_id: z.string().nullable().optional(),
  status: EventStatusSchema.optional(),
  resolution_summary: z.string().nullable().optional(),
});

export const ManageCalendarEventActionSchema = z.enum(['create', 'delete']);

export const ManageCalendarEventInputSchema = z.object({
  action: ManageCalendarEventActionSchema,
  calendar_event_id: z.string().optional(),
  month: z.number().int().min(1).max(12).optional(),
  day: z.number().int().min(1).max(31).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  tier: EventTierSchema.optional(),
  location_id: z.string().nullable().optional(),
});
