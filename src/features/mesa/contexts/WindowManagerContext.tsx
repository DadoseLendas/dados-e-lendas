'use client';
import { createContext, useContext, useState, useCallback, useRef } from 'react';

const SLOT_GAP = 304;
const BASE_X = 64;
const BASE_Y = 80;
const BASE_Z = 100;

interface WindowPosition {
  x: number;
  y: number;
}

interface WindowRegistration {
  slot: number;
  position: WindowPosition;
}

interface WindowManagerContextType {
  registerWindow: (id: string) => WindowRegistration;
  unregisterWindow: (id: string) => void;
  bringToFront: (id: string) => number;
  getZIndex: (id: string) => number;
}

const WindowManagerContext = createContext<WindowManagerContextType | null>(null);

export function WindowManagerProvider({ children }: { children: React.ReactNode }) {
  const [slots, setSlots] = useState<Map<string, number>>(new Map());
  const [zIndices, setZIndices] = useState<Map<string, number>>(new Map());
  const nextZRef = useRef(BASE_Z);
  const usedSlotsRef = useRef<Set<number>>(new Set());

  const registerWindow = useCallback((id: string) => {
    let slot = 0;
    while (usedSlotsRef.current.has(slot)) slot++;
    usedSlotsRef.current.add(slot);
    const z = nextZRef.current++;
    setSlots(prev => new Map(prev).set(id, slot));
    setZIndices(prev => new Map(prev).set(id, z));
    return { slot, position: { x: BASE_X + slot * SLOT_GAP, y: BASE_Y } };
  }, []);

  const unregisterWindow = useCallback((id: string) => {
    setSlots(prev => {
      const next = new Map(prev);
      const slot = next.get(id);
      if (slot !== undefined) usedSlotsRef.current.delete(slot);
      next.delete(id);
      return next;
    });
    setZIndices(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const bringToFront = useCallback((id: string) => {
    const z = nextZRef.current++;
    setZIndices(prev => new Map(prev).set(id, z));
    return z;
  }, []);

  const getZIndex = useCallback((id: string) => {
    return zIndices.get(id) ?? BASE_Z;
  }, [zIndices]);

  return (
    <WindowManagerContext.Provider value={{ registerWindow, unregisterWindow, bringToFront, getZIndex }}>
      {children}
    </WindowManagerContext.Provider>
  );
}

export function useWindowManager() {
  const ctx = useContext(WindowManagerContext);
  if (!ctx) throw new Error('useWindowManager must be used within WindowManagerProvider');
  return ctx;
}
