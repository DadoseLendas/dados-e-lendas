'use client';

export interface Token {
  id: string;
  url: string;
  x: number;
  y: number;
  rotation?: number;
  name?: string;
  characterId?: number | null;
  imgOffsetX?: number;
  imgOffsetY?: number;
  isMonster?: boolean;
  hp?: number;
  maxHp?: number;
  sizeCategory?: 'Tiny' | 'Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan';
}

export interface UserRuler {
  userId: string;
  userName: string;
  showRuler: boolean;
  rulerStart: { x: number; y: number } | null;
  rulerEnd: { x: number; y: number } | null;
  rulerLocked: boolean;
  isRulerDragging: boolean;
  color: string;
  rulerShape?: 'line' | 'circle' | 'cone' | 'square';
}

export type RollDiceFunc = (formula: string, isSecret: boolean, mode: 'normal' | 'advantage' | 'disadvantage') => Promise<any | null>;