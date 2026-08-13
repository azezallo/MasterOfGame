import { useState, useEffect, useCallback } from 'react';
import type { Item } from '../../items/types/item';
import type {
  PropertyProfile,
  PropertyTab,
  StorageCache,
  EncumbranceStatus,
} from '../types/property';
import {
  fetchProperty,
  payRent,
  toggleBackpack,
  storageTransfer,
} from '../api/propertyApi';

interface UsePropertyOptions {
  sessionId: string;
  ownerType?: 'player' | 'npc' | 'organization';
  ownerId?: string;
}

export function useProperty({
  sessionId,
  ownerType = 'player',
  ownerId = 'player_1',
}: UsePropertyOptions) {
  const [activeTab, setActiveTab] = useState<PropertyTab>('equipment');
  const [property, setProperty] = useState<PropertyProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);

  const [activeChestModal, setActiveChestModal] = useState<StorageCache | null>(null);
  const [isChestModalOpen, setIsChestModalOpen] = useState<boolean>(false);

  const loadPropertyData = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const profile = await fetchProperty(sessionId, ownerType, ownerId);
      setProperty(profile);
    } catch (err: any) {
      setError(err.message || 'Помилка завантаження даних майна');
    } finally {
      setLoading(false);
    }
  }, [sessionId, ownerType, ownerId]);

  useEffect(() => {
    loadPropertyData();

    const handleTurnCompleted = () => {
      loadPropertyData();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('game:turn_completed', handleTurnCompleted);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('game:turn_completed', handleTurnCompleted);
      }
    };
  }, [loadPropertyData]);

  const openDossier = (item: Item) => {
    setSelectedItem(item);
    setIsDossierOpen(true);
  };

  const closeDossier = () => {
    setSelectedItem(null);
    setIsDossierOpen(false);
  };

  const openChestModal = (cache: StorageCache) => {
    setActiveChestModal(cache);
    setIsChestModalOpen(true);
  };

  const closeChestModal = () => {
    setActiveChestModal(null);
    setIsChestModalOpen(false);
  };

  const handlePayRent = async (propertyId: string, days = 7) => {
    if (!property) return;
    try {
      await payRent(sessionId, { property_id: propertyId, days });
      setProperty(prev => {
        if (!prev) return null;
        const targetProp = prev.real_estate.find(r => r.property_id === propertyId);
        if (!targetProp || !targetProp.rent_details) return prev;

        const totalCost = targetProp.rent_details.cost_per_day_coins * days;
        if (prev.finances.coins < totalCost) return prev;

        return {
          ...prev,
          finances: {
            ...prev.finances,
            coins: prev.finances.coins - totalCost,
          },
          real_estate: prev.real_estate.map(r =>
            r.property_id === propertyId && r.rent_details
              ? {
                  ...r,
                  rent_details: {
                    ...r.rent_details,
                    paid_until_day: r.rent_details.paid_until_day + days,
                  },
                }
              : r
          ),
        };
      });
    } catch (err: any) {
      setError(err.message || 'Не вдалося оплатити оренду');
    }
  };

  const handleToggleBackpack = async (isEquipped: boolean) => {
    if (!property) return;
    try {
      await toggleBackpack(sessionId, { is_equipped: isEquipped });
      setProperty(prev => {
        if (!prev) return null;
        const currentStats = prev.pocket_inventory.weight_stats;
        const total = isEquipped
          ? currentStats.equipped_and_pockets_weight_kg + currentStats.backpack_weight_kg
          : currentStats.equipped_and_pockets_weight_kg;

        const max = currentStats.max_carry_weight_kg;
        const newEncumbrance: EncumbranceStatus =
          total > max * 1.5 ? 'overloaded' : total > max ? 'heavy' : 'normal';

        return {
          ...prev,
          pocket_inventory: {
            ...prev.pocket_inventory,
            backpack: {
              ...prev.pocket_inventory.backpack,
              is_equipped: isEquipped,
            },
            weight_stats: {
              ...currentStats,
              total_weight_kg: total,
              encumbrance_status: newEncumbrance,
            },
          },
        };
      });
    } catch (err: any) {
      setError(err.message || 'Не вдалося змінити стан рюкзака');
    }
  };

  const handleStorageTransfer = async (
    cacheId: string,
    action: 'deposit' | 'withdraw',
    itemId: string,
    quantity: number
  ) => {
    if (!property) return;
    try {
      await storageTransfer(sessionId, { cache_id: cacheId, action, item_id: itemId, quantity });
      setProperty(prev => {
        if (!prev) return null;
        const cache = prev.storage_caches.find(c => c.cache_id === cacheId);
        if (!cache) return prev;

        let updatedBackpackItems = [...prev.pocket_inventory.backpack.items];
        let updatedCacheItems = [...(cache.items || [])];

        if (action === 'withdraw') {
          const targetInCache = updatedCacheItems.find(i => i.item_id === itemId);
          if (!targetInCache) return prev;

          const transferQty = Math.min(targetInCache.quantity, quantity);
          if (targetInCache.quantity <= transferQty) {
            updatedCacheItems = updatedCacheItems.filter(i => i.item_id !== itemId);
          } else {
            targetInCache.quantity -= transferQty;
          }

          const existingInBackpack = updatedBackpackItems.find(i => i.item_id === itemId);
          if (existingInBackpack) {
            existingInBackpack.quantity += transferQty;
          } else {
            updatedBackpackItems.push({
              item_id: itemId,
              quantity: transferQty,
              resolved_item: targetInCache.resolved_item,
            });
          }
        } else {
          const targetInBackpack = updatedBackpackItems.find(i => i.item_id === itemId);
          if (!targetInBackpack) return prev;

          const transferQty = Math.min(targetInBackpack.quantity, quantity);
          if (targetInBackpack.quantity <= transferQty) {
            updatedBackpackItems = updatedBackpackItems.filter(i => i.item_id !== itemId);
          } else {
            targetInBackpack.quantity -= transferQty;
          }

          const existingInCache = updatedCacheItems.find(i => i.item_id === itemId);
          if (existingInCache) {
            existingInCache.quantity += transferQty;
          } else {
            updatedCacheItems.push({
              item_id: itemId,
              quantity: transferQty,
              resolved_item: targetInBackpack.resolved_item,
            });
          }
        }

        const updatedCaches = prev.storage_caches.map(c =>
          c.cache_id === cacheId ? { ...c, items: updatedCacheItems } : c
        );

        if (activeChestModal && activeChestModal.cache_id === cacheId) {
          setActiveChestModal({ ...activeChestModal, items: updatedCacheItems });
        }

        return {
          ...prev,
          pocket_inventory: {
            ...prev.pocket_inventory,
            backpack: {
              ...prev.pocket_inventory.backpack,
              items: updatedBackpackItems,
            },
          },
          storage_caches: updatedCaches,
        };
      });
    } catch (err: any) {
      setError(err.message || 'Помилка переміщення предметів');
    }
  };

  return {
    activeTab,
    setActiveTab,
    property,
    loading,
    error,
    selectedItem,
    isDossierOpen,
    openDossier,
    closeDossier,
    activeChestModal,
    isChestModalOpen,
    openChestModal,
    closeChestModal,
    handlePayRent,
    handleToggleBackpack,
    handleStorageTransfer,
    refetch: loadPropertyData,
  };
}
