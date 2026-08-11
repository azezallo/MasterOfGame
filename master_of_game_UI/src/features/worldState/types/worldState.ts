export interface WorldStateTime {
  current_date: string;
  narrative_date: string;
  is_night: boolean;
}

export interface WeatherTimelineItem {
  from_hour: number;
  to_hour: number;
  condition: string;
}

export interface WorldStateWeather {
  current_condition: string;
  timeline?: WeatherTimelineItem[];
}

export type WorldEventTier = 'GLOBAL' | 'REGIONAL' | 'LOCAL';
export type WorldEventStatus = 'ACTIVE' | 'RESOLVED' | 'INACTIVE' | 'ARCHIVED';

export interface WorldEvent {
  id: string;
  title: string;
  description: string;
  tier: WorldEventTier;
  location_id?: string;
  start_date: string;
  status: WorldEventStatus;
  resolution_summary?: string;
}

export interface WorldState {
  time: WorldStateTime;
  weather: WorldStateWeather;
  events?: WorldEvent[];
}
