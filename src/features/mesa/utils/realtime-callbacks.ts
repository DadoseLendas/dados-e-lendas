'use client';
import { Token, UserRuler } from '@/features/mesa/types';

interface RealtimeCallbacksInput {
  setTokens: React.Dispatch<React.SetStateAction<Token[]>>;
  setRulers: React.Dispatch<React.SetStateAction<Map<string, UserRuler>>>;
  fetchPlayerCharacters: () => Promise<void>;
}

export function buildRealtimeCallbacks({
  setTokens, setRulers, fetchPlayerCharacters,
}: RealtimeCallbacksInput) {
  return {
    onTokenMove: ({ tokenId, x, y, rotation }: { tokenId: string; x: number; y: number; rotation?: number }) => {
      setTokens(prev => prev.map(t => t.id === tokenId ? { ...t, x, y, rotation: rotation ?? t.rotation ?? 0 } : t));
    },
    onTokenRotate: ({ tokenId, rotation }: { tokenId: string; rotation: number }) => {
      const normalized = rotation % 360;
      const safe = normalized < 0 ? normalized + 360 : normalized;
      setTokens(prev => prev.map(t => t.id === tokenId ? { ...t, rotation: safe } : t));
    },
    onTokenDelete: ({ tokenId }: { tokenId: string }) => {
      setTokens(prev => prev.filter(t => t.id !== tokenId));
    },
    onTokenAdd: ({ token }: { token: Token }) => {
      setTokens(prev => prev.find(t => t.id === token.id) ? prev : [...prev, token]);
    },
    onMapChange: () => {},
    onRulerChange: (ruler: UserRuler, uid: string | null) => {
      if (ruler.userId !== uid) {
        setRulers(prev => { const next = new Map(prev); next.set(ruler.userId, ruler); return next; });
      }
    },
    onTokenInsert: (row: Record<string, unknown>) => {
      const t = row as any;
      setTokens(prev => {
        if (prev.find(tk => tk.id === t.id)) return prev;
        return [...prev, {
          id: t.id,
          url: t.url || '',
          x: t.x,
          y: t.y,
          rotation: t.rotation ?? 0,
          characterId: t.character_id ?? null,
          name: t.name ?? undefined,
          isMonster: t.is_monster ?? false,
          imgOffsetX: 50,
          imgOffsetY: 50,
          sizeCategory: t.size_category ?? 'Medium',
        } as Token];
      });
    },
    onTokenDeletePostgres: (row: Record<string, unknown>) => {
      setTokens(prev => prev.filter(t => t.id !== (row as any).id));
    },
    onMembersChange: () => { fetchPlayerCharacters(); },
  };
}
