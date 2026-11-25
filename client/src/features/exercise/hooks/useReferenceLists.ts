import { useEffect, useState } from "react";
import type { ReferenceItem } from "shared";
import { isAbortError } from "../../../services/api";
import { readCategories, readEquipments } from "../services/exerciseService";

// The groups and the equipment, loaded once for the filter grids. If they
// cannot be loaded, the grids simply stay empty: the list still works.
export function useReferenceLists() {
  const [categories, setCategories] = useState<ReferenceItem[]>([]);
  const [equipments, setEquipments] = useState<ReferenceItem[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      readCategories(controller.signal),
      readEquipments(controller.signal),
    ])
      .then(([loadedCategories, loadedEquipments]) => {
        setCategories(loadedCategories);
        setEquipments(loadedEquipments);
      })
      .catch((error: unknown) => {
        if (!isAbortError(error)) {
          setCategories([]);
          setEquipments([]);
        }
      });

    return () => controller.abort();
  }, []);

  return { categories, equipments };
}
