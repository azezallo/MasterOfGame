import { useState, useEffect, useCallback } from 'react';
import type { NpcData, NpcLifecycleStatus } from '../types/npc';
import { fetchNpcs, fetchNpcDossier, updateNpcPlayerNotes } from '../api/npcApi';

export interface UseNpcOptions {
  sessionId: string;
  autoFetchActive?: boolean;
}

export function useNpc({ sessionId, autoFetchActive = true }: UseNpcOptions) {
  const [activeNpcs, setActiveNpcs] = useState<NpcData[]>([]);
  const [allNpcs, setAllNpcs] = useState<NpcData[]>([]);
  const [selectedNpc, setSelectedNpc] = useState<NpcData | null>(null);

  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
  const [isDossierOpen, setIsDossierOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<NpcLifecycleStatus | 'all'>('all');

  const [isLoadingActive, setIsLoadingActive] = useState(false);
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(false);
  const [isLoadingDossier, setIsLoadingDossier] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadActiveNpcs = useCallback(async () => {
    if (!sessionId) return;
    setIsLoadingActive(true);
    try {
      const data = await fetchNpcs(sessionId, { activeOnly: true });
      setActiveNpcs(data.slice(0, 5));
    } catch {
      setActiveNpcs([]);
    } finally {
      setIsLoadingActive(false);
    }
  }, [sessionId]);

  const loadDirectoryNpcs = useCallback(async () => {
    if (!sessionId) return;
    setIsLoadingDirectory(true);
    try {
      const data = await fetchNpcs(sessionId, {
        status: statusFilter,
        query: searchQuery,
      });
      setAllNpcs(data);
    } catch {
      setAllNpcs([]);
    } finally {
      setIsLoadingDirectory(false);
    }
  }, [sessionId, statusFilter, searchQuery]);

  const openDossier = useCallback(
    async (npcId: string) => {
      if (!sessionId || !npcId) return;
      setIsLoadingDossier(true);
      setIsDossierOpen(true);
      setSaveError(null);
      setSaveSuccess(false);

      try {
        const dossier = await fetchNpcDossier(sessionId, npcId);
        setSelectedNpc(dossier);
      } catch {
        setSelectedNpc(null);
      } finally {
        setIsLoadingDossier(false);
      }
    },
    [sessionId]
  );

  const closeDossier = useCallback(() => {
    setIsDossierOpen(false);
    setSelectedNpc(null);
    setSaveError(null);
    setSaveSuccess(false);
  }, []);

  const openDirectory = useCallback(() => {
    setIsDirectoryOpen(true);
    loadDirectoryNpcs();
  }, [loadDirectoryNpcs]);

  const closeDirectory = useCallback(() => {
    setIsDirectoryOpen(false);
  }, []);

  const savePlayerNotes = useCallback(
    async (notes: string) => {
      if (!sessionId || !selectedNpc) return;
      setIsSavingNotes(true);
      setSaveError(null);
      setSaveSuccess(false);

      try {
        const res = await updateNpcPlayerNotes(sessionId, selectedNpc.npc_id, notes);
        if (res.success) {
          setSaveSuccess(true);
          setSelectedNpc((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              knowledge: {
                ...prev.knowledge,
                player_notes: {
                  content: res.notes,
                  last_updated: res.lastUpdated,
                },
              },
            };
          });

          setActiveNpcs((prev) =>
            prev.map((n) =>
              n.npc_id === selectedNpc.npc_id
                ? {
                    ...n,
                    knowledge: {
                      ...n.knowledge,
                      player_notes: { content: res.notes, last_updated: res.lastUpdated },
                    },
                  }
                : n
            )
          );

          setAllNpcs((prev) =>
            prev.map((n) =>
              n.npc_id === selectedNpc.npc_id
                ? {
                    ...n,
                    knowledge: {
                      ...n.knowledge,
                      player_notes: { content: res.notes, last_updated: res.lastUpdated },
                    },
                  }
                : n
            )
          );

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
    [sessionId, selectedNpc]
  );

  useEffect(() => {
    if (autoFetchActive) {
      loadActiveNpcs();
    }
  }, [autoFetchActive, loadActiveNpcs]);

  useEffect(() => {
    if (isDirectoryOpen) {
      loadDirectoryNpcs();
    }
  }, [isDirectoryOpen, loadDirectoryNpcs]);

  return {
    activeNpcs,
    allNpcs,
    selectedNpc,
    isDirectoryOpen,
    isDossierOpen,
    searchQuery,
    statusFilter,
    isLoadingActive,
    isLoadingDirectory,
    isLoadingDossier,
    isSavingNotes,
    saveError,
    saveSuccess,
    setSearchQuery,
    setStatusFilter,
    openDirectory,
    closeDirectory,
    openDossier,
    closeDossier,
    savePlayerNotes,
    refreshActive: loadActiveNpcs,
    refreshDirectory: loadDirectoryNpcs,
  };
}
