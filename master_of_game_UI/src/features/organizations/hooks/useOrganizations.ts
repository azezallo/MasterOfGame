import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  OrganizationSummary,
  OrganizationDossier,
  OrganizationTab,
} from '../types/organization';
import {
  fetchOrganizations,
  fetchOrganizationDetails,
  updateOrganizationNotes,
} from '../api/organizationsApi';

export interface UseOrganizationsOptions {
  sessionId: string;
  autoFetch?: boolean;
}

export function useOrganizations({ sessionId, autoFetch = true }: UseOrganizationsOptions) {
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [selectedOrgDossier, setSelectedOrgDossier] = useState<OrganizationDossier | null>(null);

  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
  const [isDossierOpen, setIsDossierOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [tabFilter, setTabFilter] = useState<OrganizationTab>('all');

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDossier, setIsLoadingDossier] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadOrganizations = useCallback(async () => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      const data = await fetchOrganizations(sessionId);
      setOrganizations(data);
    } catch {
      setOrganizations([]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const openDossier = useCallback(
    async (orgId: string) => {
      if (!sessionId || !orgId) return;
      setIsLoadingDossier(true);
      setIsDossierOpen(true);
      setSaveError(null);
      setSaveSuccess(false);

      try {
        const dossier = await fetchOrganizationDetails(sessionId, orgId);
        setSelectedOrgDossier(dossier);
      } catch {
        setSelectedOrgDossier(null);
      } finally {
        setIsLoadingDossier(false);
      }
    },
    [sessionId]
  );

  const closeDossier = useCallback(() => {
    setIsDossierOpen(false);
    setSelectedOrgDossier(null);
    setSaveError(null);
    setSaveSuccess(false);
  }, []);

  const openDirectory = useCallback(() => {
    setIsDirectoryOpen(true);
    loadOrganizations();
  }, [loadOrganizations]);

  const closeDirectory = useCallback(() => {
    setIsDirectoryOpen(false);
  }, []);

  const savePlayerNotes = useCallback(
    async (orgId: string, notes: string) => {
      if (!sessionId || !orgId) return;
      setIsSavingNotes(true);
      setSaveError(null);
      setSaveSuccess(false);

      try {
        const res = await updateOrganizationNotes(sessionId, orgId, notes);
        if (res.success) {
          setSaveSuccess(true);
          setSelectedOrgDossier((prev) => {
            if (!prev || prev.id !== orgId) return prev;
            return {
              ...prev,
              player_notes: res.notes,
            };
          });

          setTimeout(() => setSaveSuccess(false), 3000);
        } else {
          setSaveError('Помилка при збереженні нотаток.');
        }
      } catch {
        setSaveError('Не вдалося зберегти нотатки.');
      } finally {
        setIsSavingNotes(false);
      }
    },
    [sessionId]
  );

  const filteredOrganizations = useMemo(() => {
    let result = [...organizations];

    if (tabFilter === 'joined') {
      result = result.filter((o) => !!o.player_rank);
    } else if (tabFilter === 'friendly') {
      result = result.filter((o) => o.player_reputation > 10);
    } else if (tabFilter === 'hostile') {
      result = result.filter((o) => o.player_reputation < -10);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.description.toLowerCase().includes(q) ||
          (o.type && o.type.toLowerCase().includes(q))
      );
    }

    return result;
  }, [organizations, tabFilter, searchQuery]);

  useEffect(() => {
    if (autoFetch) {
      loadOrganizations();
    }
  }, [autoFetch, loadOrganizations]);

  return {
    organizations,
    filteredOrganizations,
    selectedOrgDossier,
    isDirectoryOpen,
    isDossierOpen,
    searchQuery,
    tabFilter,
    isLoading,
    isLoadingDossier,
    isSavingNotes,
    saveError,
    saveSuccess,
    setSearchQuery,
    setTabFilter,
    openDirectory,
    closeDirectory,
    openDossier,
    closeDossier,
    savePlayerNotes,
    refreshOrganizations: loadOrganizations,
  };
}
