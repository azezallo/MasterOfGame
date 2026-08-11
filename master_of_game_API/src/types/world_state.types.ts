import { z } from 'zod';
import {
  EventTierSchema,
  EventStatusSchema,
  TimeStateSchema,
  WeatherTimelineItemSchema,
  WeatherStateSchema,
  WorldEventSchema,
  CalendarEventSchema,
  WorldStateSchema,
  AdvanceTimeInputSchema,
  OverrideWeatherInputSchema,
  ManageEventInputSchema,
  ManageCalendarEventInputSchema,
} from '../schemas/world_state.schema';

export type EventTier = z.infer<typeof EventTierSchema>;
export type EventStatus = z.infer<typeof EventStatusSchema>;

export type TimeState = z.infer<typeof TimeStateSchema>;
export type WeatherTimelineItem = z.infer<typeof WeatherTimelineItemSchema>;
export type WeatherState = z.infer<typeof WeatherStateSchema>;
export type WorldEvent = z.infer<typeof WorldEventSchema>;
export type CalendarEvent = z.infer<typeof CalendarEventSchema>;
export type WorldStateResponse = z.infer<typeof WorldStateSchema>;

export type AdvanceTimeInput = z.infer<typeof AdvanceTimeInputSchema>;
export type OverrideWeatherInput = z.infer<typeof OverrideWeatherInputSchema>;
export type ManageEventInput = z.infer<typeof ManageEventInputSchema>;
export type ManageCalendarEventInput = z.infer<typeof ManageCalendarEventInputSchema>;
