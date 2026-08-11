export interface RankDefinition {
  rank_id: string;
  rank_name: string;
  superior_id: string | null;
  privileges: string[];
  duties: string[];
}

export interface AffiliationInteraction {
  timestamp: string;
  description: string;
  reputation_change: number;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  type: string;
  is_secret: boolean;
  description: string;
  player_rank?: string | null;
  player_reputation: number;
}

export interface OrganizationDossier extends OrganizationSummary {
  public_objectives: string[];
  hierarchy: RankDefinition[];
  mermaid_graph?: string;
  interactions: AffiliationInteraction[];
  player_notes?: string;
}

export type OrganizationTab = 'all' | 'joined' | 'friendly' | 'hostile';

export type ReputationStatus = 'hostile' | 'unfriendly' | 'neutral' | 'friendly' | 'honored';

export function getReputationStatus(reputation: number): ReputationStatus {
  if (reputation < -50) return 'hostile';
  if (reputation < -10) return 'unfriendly';
  if (reputation <= 10) return 'neutral';
  if (reputation <= 50) return 'friendly';
  return 'honored';
}

export function getReputationLabel(
  reputation: number,
  t: (key: string, options?: any) => string
): string {
  const status = getReputationStatus(reputation);
  return t(`organizations.reputation.${status}`, { defaultValue: status });
}
