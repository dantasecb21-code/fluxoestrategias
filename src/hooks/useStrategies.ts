import { useState, useEffect, useCallback } from "react";
import { Strategy, DEFAULT_CATEGORIES, StrategyCategory, StrategyItem, StrategyMeta } from "@/types/strategy";

const STORAGE_KEY = "99food-strategies";

function generateId() {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

function loadStrategies(): Strategy[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveStrategies(strategies: Strategy[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(strategies));
}

export function useStrategies() {
  const [strategies, setStrategies] = useState<Strategy[]>(loadStrategies);

  useEffect(() => {
    saveStrategies(strategies);
  }, [strategies]);

  const createStrategy = useCallback((meta: StrategyMeta): Strategy => {
    const newStrategy: Strategy = {
      id: generateId(),
      meta,
      categories: DEFAULT_CATEGORIES.map((c) => ({
        ...c,
        id: generateId(),
        items: c.items.map((i) => ({ ...i, id: generateId(), checked: false })),
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setStrategies((prev) => [newStrategy, ...prev]);
    return newStrategy;
  }, []);

  const updateStrategy = useCallback((updated: Strategy) => {
    setStrategies((prev) =>
      prev.map((s) => (s.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : s))
    );
  }, []);

  const deleteStrategy = useCallback((id: string) => {
    setStrategies((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const duplicateStrategy = useCallback((id: string): Strategy | null => {
    const original = strategies.find((s) => s.id === id);
    if (!original) return null;
    const dup: Strategy = {
      ...JSON.parse(JSON.stringify(original)),
      id: generateId(),
      meta: { ...original.meta, storeName: original.meta.storeName + " (Cópia)" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setStrategies((prev) => [dup, ...prev]);
    return dup;
  }, [strategies]);

  return { strategies, createStrategy, updateStrategy, deleteStrategy, duplicateStrategy };
}

export function useCategoryEditor(categories: StrategyCategory[], onChange: (cats: StrategyCategory[]) => void) {
  const addCategory = (name: string) => {
    onChange([...categories, { id: generateId(), name, items: [] }]);
  };

  const editCategory = (id: string, name: string) => {
    onChange(categories.map((c) => (c.id === id ? { ...c, name } : c)));
  };

  const removeCategory = (id: string) => {
    onChange(categories.filter((c) => c.id !== id));
  };

  const addItem = (catId: string, item: Omit<StrategyItem, "id" | "checked">) => {
    onChange(
      categories.map((c) =>
        c.id === catId ? { ...c, items: [...c.items, { ...item, id: generateId(), checked: false }] } : c
      )
    );
  };

  const editItem = (catId: string, itemId: string, updates: Partial<StrategyItem>) => {
    onChange(
      categories.map((c) =>
        c.id === catId ? { ...c, items: c.items.map((i) => (i.id === itemId ? { ...i, ...updates } : i)) } : c
      )
    );
  };

  const removeItem = (catId: string, itemId: string) => {
    onChange(
      categories.map((c) =>
        c.id === catId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c
      )
    );
  };

  const toggleItem = (catId: string, itemId: string) => {
    onChange(
      categories.map((c) =>
        c.id === catId ? { ...c, items: c.items.map((i) => (i.id === itemId ? { ...i, checked: !i.checked } : i)) } : c
      )
    );
  };

  return { addCategory, editCategory, removeCategory, addItem, editItem, removeItem, toggleItem };
}
