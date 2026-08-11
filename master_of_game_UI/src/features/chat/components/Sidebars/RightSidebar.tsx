import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EnvironmentSidebar } from '@/features/map/components/EnvironmentSidebar/EnvironmentSidebar';
import { InteractiveMapModal } from '@/features/map/components/InteractiveMapModal/InteractiveMapModal';
import { useMapNavigation } from '@/features/map/hooks/useMapNavigation';
import {
  useNpc,
  ActiveNpcWidget,
  GlobalNpcDirectoryModal,
  NpcDossierModal,
} from '@/features/npc';
import {
  useOrganizations,
  OrganizationsWidget,
  GlobalOrganizationDirectoryModal,
  OrganizationDossierModal,
} from '@/features/organizations';
import styles from './RightSidebar.module.css';

interface RightSidebarProps {
  sessionId: string;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({ sessionId }) => {
  const { t } = useTranslation();
  const [socialTab, setSocialTab] = useState<'npc' | 'organizations'>('npc');

  const {
    currentLocation,
    locations,
    isLoading,
    isMapOpen,
    currentMapContext,
    mapHistory,
    handleLocationSelect,
    handleMapBack,
    handleBreadcrumbClick,
    toggleMap,
    closeMap
  } = useMapNavigation(sessionId);

  const {
    activeNpcs,
    allNpcs,
    selectedNpc,
    isDirectoryOpen: isNpcDirOpen,
    isDossierOpen: isNpcDossierOpen,
    searchQuery: npcSearchQuery,
    statusFilter: npcStatusFilter,
    isLoadingActive: isNpcActiveLoading,
    isLoadingDirectory: isNpcDirLoading,
    isSavingNotes: isNpcSavingNotes,
    saveError: npcSaveError,
    saveSuccess: npcSaveSuccess,
    setSearchQuery: setNpcSearchQuery,
    setStatusFilter: setNpcStatusFilter,
    openDirectory: openNpcDirectory,
    closeDirectory: closeNpcDirectory,
    openDossier: openNpcDossier,
    closeDossier: closeNpcDossier,
    savePlayerNotes: saveNpcNotes,
  } = useNpc({ sessionId });

  const {
    organizations,
    filteredOrganizations,
    selectedOrgDossier,
    isDirectoryOpen: isOrgDirOpen,
    isDossierOpen: isOrgDossierOpen,
    searchQuery: orgSearchQuery,
    tabFilter: orgTabFilter,
    isLoading: isOrgLoading,
    isLoadingDossier: isOrgDossierLoading,
    isSavingNotes: isOrgSavingNotes,
    saveError: orgSaveError,
    saveSuccess: orgSaveSuccess,
    setSearchQuery: setOrgSearchQuery,
    setTabFilter: setOrgTabFilter,
    openDirectory: openOrgDirectory,
    closeDirectory: closeOrgDirectory,
    openDossier: openOrgDossier,
    closeDossier: closeOrgDossier,
    savePlayerNotes: saveOrgNotes,
  } = useOrganizations({ sessionId });

  return (
    <div className={styles.container}>
      <div className={styles.mapButtonContainer}>
        <button 
          onClick={toggleMap}
          className={styles.mapButton}
        >
          🗺️ {t('map.open_map')}
        </button>
      </div>

      <div className={styles.environmentContainer}>
        {isLoading ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyStateTitle}>{t('map.loading_environment')}</p>
          </div>
        ) : !currentLocation ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyStateTitle}>{t('chat.right_sidebar')}</p>
            <p className={styles.emptyStateSubtitle}>{t('map.location_data_missing')}</p>
          </div>
        ) : (
          <EnvironmentSidebar location={currentLocation} />
        )}
      </div>

      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(15, 23, 42, 0.8)',
        padding: '0.4rem 0.5rem',
        margin: '0 10px 8px 10px',
        gap: '0.5rem',
        borderRadius: '8px'
      }}>
        <button
          onClick={() => setSocialTab('npc')}
          style={{
            flex: 1,
            padding: '0.4rem 0.6rem',
            borderRadius: '6px',
            border: 'none',
            background: socialTab === 'npc' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
            color: socialTab === 'npc' ? '#38bdf8' : '#94a3b8',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.85rem',
            transition: 'all 0.2s ease',
          }}
        >
          {t('organizations.sidebar_tab_npc', '👥 NPC')}
        </button>
        <button
          onClick={() => setSocialTab('organizations')}
          style={{
            flex: 1,
            padding: '0.4rem 0.6rem',
            borderRadius: '6px',
            border: 'none',
            background: socialTab === 'organizations' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
            color: socialTab === 'organizations' ? '#38bdf8' : '#94a3b8',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.85rem',
            transition: 'all 0.2s ease',
          }}
        >
          {t('organizations.sidebar_tab_organizations', '🏛️ Фракції')}
        </button>
      </div>

      {socialTab === 'npc' ? (
        <ActiveNpcWidget
          activeNpcs={activeNpcs}
          isLoading={isNpcActiveLoading}
          onOpenDirectory={openNpcDirectory}
          onSelectNpc={openNpcDossier}
        />
      ) : (
        <OrganizationsWidget
          organizations={organizations}
          isLoading={isOrgLoading}
          onOpenDirectory={openOrgDirectory}
          onSelectOrganization={openOrgDossier}
        />
      )}

      <InteractiveMapModal 
        isOpen={isMapOpen} 
        onClose={closeMap} 
        locations={locations}
        currentLocationId={currentLocation?.location_id}
        currentMapContext={currentMapContext}
        mapHistory={mapHistory}
        onLocationSelect={handleLocationSelect}
        onBack={mapHistory.length > 0 || currentMapContext ? handleMapBack : undefined}
        onBreadcrumbClick={handleBreadcrumbClick}
      />

      <GlobalNpcDirectoryModal
        isOpen={isNpcDirOpen}
        onClose={closeNpcDirectory}
        npcs={allNpcs}
        isLoading={isNpcDirLoading}
        searchQuery={npcSearchQuery}
        onSearchChange={setNpcSearchQuery}
        statusFilter={npcStatusFilter}
        onStatusFilterChange={setNpcStatusFilter}
        onSelectNpc={(id) => {
          openNpcDossier(id);
        }}
      />

      <NpcDossierModal
        npc={selectedNpc}
        isOpen={isNpcDossierOpen}
        onClose={closeNpcDossier}
        onSaveNotes={saveNpcNotes}
        isSavingNotes={isNpcSavingNotes}
        saveSuccess={npcSaveSuccess}
        saveError={npcSaveError}
      />

      <GlobalOrganizationDirectoryModal
        isOpen={isOrgDirOpen}
        onClose={closeOrgDirectory}
        organizations={filteredOrganizations}
        isLoading={isOrgLoading}
        searchQuery={orgSearchQuery}
        onSearchChange={setOrgSearchQuery}
        tabFilter={orgTabFilter}
        onTabFilterChange={setOrgTabFilter}
        onSelectOrganization={(id) => {
          openOrgDossier(id);
        }}
      />

      <OrganizationDossierModal
        organization={selectedOrgDossier}
        isOpen={isOrgDossierOpen}
        isLoading={isOrgDossierLoading}
        onClose={closeOrgDossier}
        onSaveNotes={saveOrgNotes}
        isSavingNotes={isOrgSavingNotes}
        saveSuccess={orgSaveSuccess}
        saveError={orgSaveError}
      />
    </div>
  );
};
