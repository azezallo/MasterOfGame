import { z } from 'zod';
import {
  CoordinatesSchema,
  LocationTypeSchema,
  DiscoveryStatusSchema,
  AccessStatusSchema,
  TransitionTypeSchema,
  TransitionDiscoveryStatusSchema,
  TransitionAccessStatusSchema,
  LockDetailsSchema,
  HazardLevelSchema,
  TravelPropertiesSchema,
  TransitionSchema,
  EnvironmentalStateSchema,
  StateModificationSchema,
  SecretSchema,
  ConnectedEntitiesSchema,
  LocationSchema
} from '../schemas/location.schema';

export type Coordinates = z.infer<typeof CoordinatesSchema>;
export type LocationType = z.infer<typeof LocationTypeSchema>;
export type DiscoveryStatus = z.infer<typeof DiscoveryStatusSchema>;
export type AccessStatus = z.infer<typeof AccessStatusSchema>;
export type TransitionType = z.infer<typeof TransitionTypeSchema>;
export type TransitionDiscoveryStatus = z.infer<typeof TransitionDiscoveryStatusSchema>;
export type TransitionAccessStatus = z.infer<typeof TransitionAccessStatusSchema>;
export type LockDetails = z.infer<typeof LockDetailsSchema>;
export type HazardLevel = z.infer<typeof HazardLevelSchema>;
export type TravelProperties = z.infer<typeof TravelPropertiesSchema>;
export type Transition = z.infer<typeof TransitionSchema>;
export type EnvironmentalState = z.infer<typeof EnvironmentalStateSchema>;
export type StateModification = z.infer<typeof StateModificationSchema>;
export type Secret = z.infer<typeof SecretSchema>;
export type ConnectedEntities = z.infer<typeof ConnectedEntitiesSchema>;
export type LocationData = z.infer<typeof LocationSchema>;
