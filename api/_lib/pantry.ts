export function mergePantryRow(id: string, patch: { available?: boolean; useSoon?: boolean }, existing?: { available: boolean; use_soon: boolean }) {
  return {
    ingredient_id: id,
    available: patch.available ?? existing?.available ?? false,
    use_soon: patch.useSoon ?? existing?.use_soon ?? false,
  }
}
