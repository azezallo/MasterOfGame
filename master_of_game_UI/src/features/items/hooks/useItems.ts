import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Item, ItemCategory } from '../types/item';
import { fetchItems } from '../api/itemsApi';

interface UseItemsOptions {
  sessionId: string;
  ownerType?: 'location' | 'npc' | 'player' | 'container';
  ownerId?: string;
}

export function useItems({ sessionId, ownerType = 'player', ownerId = 'player_1' }: UseItemsOptions) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);

  const loadItems = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchItems(sessionId, {
        owner_type: ownerType,
        owner_id: ownerId,
      });
      setItems(data);
    } catch (err: any) {
      setError(err.message || 'Error loading items');
    } finally {
      setLoading(false);
    }
  }, [sessionId, ownerType, ownerId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const categoriesCount = useMemo(() => {
    const counts: Record<string, number> = {
      all: items.length,
      weapon: 0,
      armor: 0,
      jewelry: 0,
      consumable: 0,
      key: 0,
      container: 0,
      document: 0,
      artifact: 0,
      misc: 0,
    };

    items.forEach(item => {
      if (counts[item.category] !== undefined) {
        counts[item.category] += 1;
      } else {
        counts.misc += 1;
      }
    });

    return counts;
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        item.public_profile.name.toLowerCase().includes(q) ||
        item.public_profile.appearance.toLowerCase().includes(q) ||
        (item.private_profile?.true_name && item.private_profile.true_name.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [items, selectedCategory, searchQuery]);

  const openDossier = (item: Item) => {
    setSelectedItem(item);
    setIsDossierOpen(true);
  };

  const closeDossier = () => {
    setSelectedItem(null);
    setIsDossierOpen(false);
  };

  return {
    items: filteredItems,
    allItems: items,
    loading,
    error,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    selectedItem,
    isDossierOpen,
    openDossier,
    closeDossier,
    refetch: loadItems,
    categoriesCount,
  };
}
