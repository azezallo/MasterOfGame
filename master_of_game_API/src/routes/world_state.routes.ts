import { Router } from 'express';
import {
  getWorldState,
  advanceTime,
  overrideWeather,
  manageEvent,
  manageCalendarEvent,
} from '../controllers/world_state.controller';

const router = Router({ mergeParams: true });

router.get('/', getWorldState);
router.post('/advance-time', advanceTime);
router.post('/override-weather', overrideWeather);
router.post('/manage-event', manageEvent);
router.post('/manage-calendar-event', manageCalendarEvent);

export default router;
