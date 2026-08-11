import { v4 as uuidv4 } from 'uuid';
import { WorldStateRepository } from '../repositories/world_state.repository';
import {
  TimeState,
  WeatherState,
  WeatherTimelineItem,
  WorldEvent,
  CalendarEvent,
  WorldStateResponse,
  AdvanceTimeInput,
  OverrideWeatherInput,
  ManageEventInput,
  ManageCalendarEventInput,
} from '../types/world_state.types';
import { AppError, ValidationError } from '../errors/app_errors';

const UKRAINIAN_MONTHS = [
  'Січня', 'Лютого', 'Березня', 'Квітня', 'Травня', 'Червня',
  'Липня', 'Серпня', 'Вересня', 'Жовтня', 'Листопада', 'Грудня'
];

export class WorldStateService {
  constructor(private repo: WorldStateRepository) {}

  public getSeason(month: number): string {
    if (month === 12 || month === 1 || month === 2) return 'Зима';
    if (month >= 3 && month <= 5) return 'Весна';
    if (month >= 6 && month <= 8) return 'Літо';
    return 'Осінь';
  }

  public getMonthName(month: number): string {
    return UKRAINIAN_MONTHS[month - 1] || 'Січня';
  }

  public formatNarrativeDate(date: Date): string {
    const day = date.getUTCDate();
    const month = date.getUTCMonth() + 1;
    const year = date.getUTCFullYear();
    const monthName = this.getMonthName(month);
    const season = this.getSeason(month);

    return `${day} ${monthName} ${year} року (${season})`;
  }

  public isNight(date: Date): boolean {
    const hour = date.getUTCHours();
    return hour < 6 || hour >= 22;
  }

  public generateProceduralTimeline(date: Date): WeatherTimelineItem[] {
    const month = date.getUTCMonth() + 1;
    const season = this.getSeason(month);

    switch (season) {
      case 'Зима':
        return [
          { from_hour: 0, to_hour: 6, condition: 'Холодна ніч, мороз' },
          { from_hour: 6, to_hour: 12, condition: 'Помірний снігопад' },
          { from_hour: 12, to_hour: 18, condition: 'Ясно, тріскучий мороз' },
          { from_hour: 18, to_hour: 24, condition: 'Хуртовина, холодний вітер' },
        ];
      case 'Весна':
        return [
          { from_hour: 0, to_hour: 6, condition: 'Ранковий туман' },
          { from_hour: 6, to_hour: 12, condition: 'Легкий весняний дощ' },
          { from_hour: 12, to_hour: 18, condition: 'Ясно, сонячно' },
          { from_hour: 18, to_hour: 24, condition: 'Теплий вечірній вітер' },
        ];
      case 'Літо':
        return [
          { from_hour: 0, to_hour: 6, condition: 'Нічна прохолода, тихо' },
          { from_hour: 6, to_hour: 12, condition: 'Ранкова злива' },
          { from_hour: 12, to_hour: 18, condition: 'Ясно, тепло' },
          { from_hour: 18, to_hour: 24, condition: 'Збираються хмари, мжичка' },
        ];
      case 'Осінь':
      default:
        return [
          { from_hour: 0, to_hour: 6, condition: 'Густа мжичка, прохолода' },
          { from_hour: 6, to_hour: 12, condition: 'Похмуро, холодний дощ' },
          { from_hour: 12, to_hour: 18, condition: 'Вітряно, хмарно' },
          { from_hour: 18, to_hour: 24, condition: 'Затяжний осінній дощ' },
        ];
    }
  }

  private ensureStateInitialized(): { currentDate: Date; timeline: WeatherTimelineItem[] } {
    let saved = this.repo.getTimeAndWeather();

    if (!saved) {
      const defaultIsoDate = '1024-06-15T14:00:00.000Z';
      const initialDate = new Date(defaultIsoDate);
      const initialTimeline = this.generateProceduralTimeline(initialDate);

      this.repo.saveTimeAndWeather(defaultIsoDate, initialTimeline);

      if (this.repo.getAllCalendarEvents().length === 0) {
        this.repo.saveCalendarEvent({
          id: 'cal_summer_solstice',
          month: 6,
          day: 21,
          title: 'Свято Літнього Сонцестояння',
          description: 'День великого сонячного свята у місті та його околицях.',
          tier: 'GLOBAL',
        });
      }

      saved = { current_date: defaultIsoDate, weather_timeline: initialTimeline };
    }

    return {
      currentDate: new Date(saved.current_date),
      timeline: saved.weather_timeline.length > 0 ? saved.weather_timeline : this.generateProceduralTimeline(new Date(saved.current_date)),
    };
  }

  public getCurrentCondition(date: Date, timeline: WeatherTimelineItem[]): string {
    const hour = date.getUTCHours();
    const item = timeline.find(t => t.from_hour <= hour && hour < t.to_hour);
    return item ? item.condition : (timeline[0]?.condition || 'Ясно, тихо');
  }

  public getWorldState(locationId?: string): WorldStateResponse {
    const { currentDate, timeline } = this.ensureStateInitialized();

    const timeState: TimeState = {
      current_date: currentDate.toISOString(),
      narrative_date: this.formatNarrativeDate(currentDate),
      is_night: this.isNight(currentDate),
    };

    const weatherState: WeatherState = {
      current_condition: this.getCurrentCondition(currentDate, timeline),
      timeline,
    };

    const allEvents = this.repo.getAllWorldEvents();

    const filteredEvents = allEvents.filter(event => {
      if (event.status === 'INACTIVE') return false;

      if (!locationId) return true;

      if (event.tier === 'GLOBAL') return true;

      if (event.tier === 'REGIONAL') {
        if (!event.location_id) return true;
        return (
          event.location_id === locationId ||
          locationId.startsWith(event.location_id) ||
          event.location_id.startsWith(locationId)
        );
      }

      if (event.tier === 'LOCAL') {
        if (!event.location_id) return true;
        return event.location_id === locationId;
      }

      return true;
    });

    return {
      time: timeState,
      weather: weatherState,
      events: filteredEvents,
    };
  }

  public advanceTime(input: AdvanceTimeInput): WorldStateResponse {
    const { currentDate: startDate, timeline: currentTimeline } = this.ensureStateInitialized();

    const addDays = input.days || 0;
    const addHours = input.hours || 0;
    const totalHoursToAdd = addDays * 24 + addHours;

    if (totalHoursToAdd <= 0) {
      return this.getWorldState();
    }

    const endDate = new Date(startDate.getTime() + totalHoursToAdd * 3600 * 1000);
    const newIsoDate = endDate.toISOString();

    let updatedTimeline = currentTimeline;
    if (startDate.getUTCMonth() !== endDate.getUTCMonth() || startDate.getUTCDate() !== endDate.getUTCDate()) {
      updatedTimeline = this.generateProceduralTimeline(endDate);
    }

    this.repo.saveTimeAndWeather(newIsoDate, updatedTimeline);

    const calendarEvents = this.repo.getAllCalendarEvents();
    const startDay = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
    const endDay = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));
    let curr = new Date(startDay.getTime());

    while (curr <= endDay) {
      const month = curr.getUTCMonth() + 1;
      const day = curr.getUTCDate();
      const year = curr.getUTCFullYear();
      const isoDateString = curr.toISOString().split('T')[0] || '';

      for (const calEvent of calendarEvents) {
        if (calEvent.month === month && calEvent.day === day) {
          const generatedEventId = `evt_cal_${calEvent.id}_${year}`;

          if (!this.repo.getWorldEvent(generatedEventId)) {
            this.repo.saveWorldEvent({
              id: generatedEventId,
              title: calEvent.title,
              description: calEvent.description,
              tier: calEvent.tier || 'GLOBAL',
              location_id: calEvent.location_id || null,
              start_date: isoDateString,
              status: 'ACTIVE',
              resolution_summary: null,
            });
          }
        }
      }

      curr.setUTCDate(curr.getUTCDate() + 1);
    }

    return this.getWorldState();
  }

  public overrideWeather(input: OverrideWeatherInput): WorldStateResponse {
    const { currentDate, timeline } = this.ensureStateInitialized();

    if (input.from_hour >= input.to_hour) {
      throw new ValidationError('from_hour must be strictly less than to_hour');
    }

    const newTimeline: WeatherTimelineItem[] = [];

    for (const item of timeline) {
      if (item.to_hour <= input.from_hour || item.from_hour >= input.to_hour) {
        newTimeline.push(item);
      } else {
        if (item.from_hour < input.from_hour) {
          newTimeline.push({ from_hour: item.from_hour, to_hour: input.from_hour, condition: item.condition });
        }
        if (item.to_hour > input.to_hour) {
          newTimeline.push({ from_hour: input.to_hour, to_hour: item.to_hour, condition: item.condition });
        }
      }
    }

    newTimeline.push({
      from_hour: input.from_hour,
      to_hour: input.to_hour,
      condition: input.condition,
    });

    newTimeline.sort((a, b) => a.from_hour - b.from_hour);

    this.repo.saveTimeAndWeather(currentDate.toISOString(), newTimeline);

    return this.getWorldState();
  }

  public manageEvent(input: ManageEventInput): WorldEvent {
    const { currentDate } = this.ensureStateInitialized();

    if (input.action === 'create') {
      if (!input.title || !input.description) {
        throw new ValidationError('Title and description are required for event creation');
      }

      const event: WorldEvent = {
        id: input.event_id || `evt_${Date.now()}_${uuidv4().substring(0, 4)}`,
        title: input.title,
        description: input.description,
        tier: input.tier || 'GLOBAL',
        location_id: input.location_id || null,
        start_date: currentDate.toISOString().split('T')[0] || '',
        status: input.status || 'ACTIVE',
        resolution_summary: input.resolution_summary || null,
      };

      this.repo.saveWorldEvent(event);
      return event;
    }

    if (input.action === 'update') {
      if (!input.event_id) {
        throw new ValidationError('event_id is required for event update');
      }

      const existing = this.repo.getWorldEvent(input.event_id);
      if (!existing) {
        throw new AppError(`World event with ID '${input.event_id}' not found`, 404);
      }

      const updated: WorldEvent = {
        ...existing,
        title: input.title !== undefined ? input.title : existing.title,
        description: input.description !== undefined ? input.description : existing.description,
        tier: input.tier !== undefined ? input.tier : existing.tier,
        location_id: input.location_id !== undefined ? input.location_id : existing.location_id,
        status: input.status !== undefined ? input.status : existing.status,
        resolution_summary: input.resolution_summary !== undefined ? input.resolution_summary : existing.resolution_summary,
      };

      this.repo.saveWorldEvent(updated);
      return updated;
    }

    if (input.action === 'resolve') {
      if (!input.event_id) {
        throw new ValidationError('event_id is required to resolve event');
      }

      const existing = this.repo.getWorldEvent(input.event_id);
      if (!existing) {
        throw new AppError(`World event with ID '${input.event_id}' not found`, 404);
      }

      const resolved: WorldEvent = {
        ...existing,
        status: 'RESOLVED',
        resolution_summary: input.resolution_summary || existing.resolution_summary || 'Подію успішно вирішено.',
      };

      this.repo.saveWorldEvent(resolved);
      return resolved;
    }

    throw new ValidationError(`Unsupported action: ${input.action}`);
  }

  public manageCalendarEvent(input: ManageCalendarEventInput): CalendarEvent | { success: boolean; deleted_id: string } {
    if (input.action === 'create') {
      if (!input.month || !input.day || !input.title || !input.description) {
        throw new ValidationError('month, day, title, and description are required to create a calendar event');
      }

      const calEvent: CalendarEvent = {
        id: input.calendar_event_id || `cal_${Date.now()}_${uuidv4().substring(0, 4)}`,
        month: input.month,
        day: input.day,
        title: input.title,
        description: input.description,
        tier: input.tier || 'GLOBAL',
        location_id: input.location_id || null,
      };

      this.repo.saveCalendarEvent(calEvent);
      return calEvent;
    }

    if (input.action === 'delete') {
      if (!input.calendar_event_id) {
        throw new ValidationError('calendar_event_id is required to delete calendar event');
      }

      this.repo.deleteCalendarEvent(input.calendar_event_id);
      return { success: true, deleted_id: input.calendar_event_id };
    }

    throw new ValidationError(`Unsupported action: ${input.action}`);
  }
}
