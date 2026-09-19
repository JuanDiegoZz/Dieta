export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / pageSize))
}

export function clampPage(page: number, total: number, pageSize: number): number {
  return Math.min(Math.max(1, page), pageCount(total, pageSize))
}

export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const safePage = clampPage(page, items.length, pageSize)
  return items.slice((safePage - 1) * pageSize, safePage * pageSize)
}
