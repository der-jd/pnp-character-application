import { useState, useCallback } from "react";

export function useEditableField<T>(initial: T) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<T>(initial);

  const startEdit = useCallback((key: string, values: T) => {
    setEditing(key);
    setEditValues(values);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditing(null);
  }, []);

  return { editing, editValues, setEditValues, startEdit, cancelEdit };
}
