import { getSessions } from '@/api/sessions';
import type { SessionMetadata } from '@/api/contracts/sessions';

export const fetchSessions = async (): Promise<SessionMetadata[]> => {
  const response = await getSessions();
  if (response.success) {
    return response.data;
  }
  throw new Error('Failed to fetch sessions');
};
