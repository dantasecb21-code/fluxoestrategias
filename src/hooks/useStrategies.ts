import { StrategyCategory, StrategyItem } from "@/types/strategy";

function generateId() {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
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

  const moveItem = (catId: string, itemId: string, direction: "up" | "down") => {
    onChange(
      categories.map((c) => {
        if (c.id !== catId) return c;
        const idx = c.items.findIndex((i) => i.id === itemId);
        if (idx < 0) return c;
        const newIdx = direction === "up" ? idx - 1 : idx + 1;
        if (newIdx < 0 || newIdx >= c.items.length) return c;
        const newItems = [...c.items];
        [newItems[idx], newItems[newIdx]] = [newItems[newIdx], newItems[idx]];
        return { ...c, items: newItems };
      })
    );
  };

  return { addCategory, editCategory, removeCategory, addItem, editItem, removeItem, toggleItem, moveItem };
}
