export interface FavoriteSnapshot {
  id: string;
  name: string;
  slug: string;
  thumbnailUrl: string | null;
  displayPrice: string | null;
  purchasable: boolean;
}

export const FAVORITES_STORAGE_KEY = "labuco:favorites:v1";
export const FAVORITES_CHANGED_EVENT = "labuco:favorites-changed";

export function readFavorites(): FavoriteSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is FavoriteSnapshot =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as FavoriteSnapshot).id === "string" &&
        typeof (item as FavoriteSnapshot).name === "string" &&
        typeof (item as FavoriteSnapshot).slug === "string",
    );
  } catch {
    return [];
  }
}

export function writeFavorites(items: FavoriteSnapshot[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(FAVORITES_CHANGED_EVENT));
}

export function hasFavorite(id: string): boolean {
  return readFavorites().some((item) => item.id === id);
}

export function toggleFavorite(snapshot: FavoriteSnapshot): boolean {
  const current = readFavorites();
  const exists = current.some((item) => item.id === snapshot.id);
  writeFavorites(
    exists
      ? current.filter((item) => item.id !== snapshot.id)
      : [snapshot, ...current],
  );
  return !exists;
}
