'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useWindowManager } from '../contexts/WindowManagerContext';
import { GripHorizontal, Minus, X } from 'lucide-react';

interface WindowWrapperProps {
  id: string;
  title: string;
  isOpen: boolean;
  onClose: () => void;
  defaultPosition?: { x: number; y: number };
  centered?: boolean;
  defaultSize?: { width: number; height?: number };
  minWidth?: number;
  minHeight?: number;
  showTitleBar?: boolean;
  hideMinimize?: boolean;
  minimized?: boolean;
  onMinimizeChange?: (minimized: boolean) => void;
  onPositionChange?: (pos: { x: number; y: number }) => void;
  children: React.ReactNode;
}

export default function WindowWrapper({
  id, title, isOpen, onClose,
  defaultPosition, centered = false, defaultSize,
  minWidth = 280, minHeight = 120,
  showTitleBar = true,
  hideMinimize = false,
  minimized: minimizedProp, onMinimizeChange,
  onPositionChange,
  children,
}: WindowWrapperProps) {
  const { bringToFront, getZIndex, registerWindow, unregisterWindow } = useWindowManager();
  const noFixedHeight = !defaultSize?.height;

  const [internalMinimized, setInternalMinimized] = useState(false);
  const isMinimized = minimizedProp !== undefined ? minimizedProp : internalMinimized;
  const setIsMinimized = onMinimizeChange || setInternalMinimized;

  const computeInitialPos = () => {
    if (defaultPosition) return defaultPosition;
    if (centered && typeof window !== 'undefined') {
      const w = defaultSize?.width ?? minWidth;
      const h = defaultSize?.height ?? 400;
      return { x: Math.max(0, (window.innerWidth - w) / 2), y: Math.max(0, (window.innerHeight - h) / 3) };
    }
    return { x: 100, y: 80 };
  };

  const [pos, setPos] = useState(computeInitialPos);
  const [size, setSize] = useState<{ width: number; height: number }>({ width: defaultSize?.width ?? minWidth, height: defaultSize?.height ?? 400 });
  const [z, setZ] = useState(100);
  const registeredRef = useRef(false);
  const elRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, origX: 0, origY: 0, origW: 0, origH: 0 });
  const resizeRef = useRef<{ edge: string; active: boolean; startX: number; startY: number; origX: number; origY: number; origW: number; origH: number }>({ edge: '', active: false, startX: 0, startY: 0, origX: 0, origY: 0, origW: 0, origH: 0 });
  const hasUserDragged = useRef(false);

  useEffect(() => {
    if (!isOpen || registeredRef.current) return;
    hasUserDragged.current = false;
    registeredRef.current = true;
    const { position } = registerWindow(id);
    if (!defaultPosition && !centered) setPos(position);
    setZ(getZIndex(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, id]);

  useEffect(() => {
    if (isOpen) return;
    registeredRef.current = false;
    unregisterWindow(id);
    hasUserDragged.current = false;
  }, [isOpen, id, unregisterWindow]);

  useEffect(() => {
    if (defaultPosition && !hasUserDragged.current) setPos(defaultPosition);
  }, [defaultPosition]);

  const handleBringToFront = useCallback(() => {
    bringToFront(id);
    setZ(getZIndex(id));
  }, [id, bringToFront, getZIndex]);

  const startDrag = useCallback((e: React.MouseEvent | MouseEvent, el: HTMLDivElement) => {
    hasUserDragged.current = true;
    const rect = el.getBoundingClientRect();
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: rect.left,
      origY: rect.top,
      origW: rect.width,
      origH: rect.height,
    };
  }, []);

  const handleTitleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleBringToFront();
    const el = elRef.current;
    if (!el) return;
    startDrag(e, el);
  }, [handleBringToFront, startDrag]);

  const handleDragDelegation = useCallback((e: React.MouseEvent) => {
    if (showTitleBar) return;
    const target = e.target as HTMLElement;
    const handle = target.closest('[data-drag-handle]') as HTMLElement | null;
    if (!handle) return;
    e.preventDefault();
    handleBringToFront();
    const el = elRef.current;
    if (!el) return;
    startDrag(e, el);
  }, [showTitleBar, handleBringToFront, startDrag]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (dragRef.current.active) {
        const newPos = {
          x: dragRef.current.origX + (e.clientX - dragRef.current.startX),
          y: dragRef.current.origY + (e.clientY - dragRef.current.startY),
        };
        setPos(newPos);
        onPositionChange?.(newPos);
        return;
      }
      if (resizeRef.current.active) {
        const r = resizeRef.current;
        const dx = e.clientX - r.startX;
        const dy = e.clientY - r.startY;
        let newX = r.origX, newY = r.origY, newW = r.origW, newH = r.origH;
        if (r.edge.includes('e')) newW = Math.max(minWidth, r.origW + dx);
        if (r.edge.includes('w')) { newW = Math.max(minWidth, r.origW - dx); newX = r.origX + (r.origW - newW); }
        if (r.edge.includes('s')) newH = Math.max(minHeight, r.origH + dy);
        if (r.edge.includes('n')) { newH = Math.max(minHeight, r.origH - dy); newY = r.origY + (r.origH - newH); }
        if (newX !== r.origX || newY !== r.origY) setPos({ x: newX, y: newY });
        setSize({ width: newW, height: newH });
        return;
      }
    };
    const onMouseUp = () => { dragRef.current.active = false; resizeRef.current.active = false; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [minWidth, minHeight]);

  const handleResizeStart = useCallback((edge: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = elRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    resizeRef.current = { edge, active: true, startX: e.clientX, startY: e.clientY, origX: rect.left, origY: rect.top, origW: rect.width, origH: rect.height };
  }, []);

  if (!isOpen) return null;

  return (
    <div
      ref={elRef}
      className="fixed overflow-hidden rounded-xl border border-[#1a2a1a] bg-[#050a05] shadow-[0_0_40px_rgba(0,0,0,0.9)] flex flex-col"
      style={{
        left: pos.x,
        top: pos.y,
        width: size.width,
        height: noFixedHeight ? undefined : (isMinimized ? 'auto' : size.height),
        zIndex: z,
        minWidth,
        minHeight: noFixedHeight ? undefined : (isMinimized ? 'auto' : minHeight),
        maxWidth: isMinimized ? 400 : undefined,
      }}
      onMouseDown={(e) => { handleBringToFront(); handleDragDelegation(e); }}
    >
      {/* Title Bar — drag handle (only if showTitleBar) */}
      {showTitleBar && (
        <div
          onMouseDown={(e) => handleTitleMouseDown(e)}
          className="bg-[#0a120a] border-b border-[#1a2a1a] px-3 py-2 flex items-center justify-between cursor-grab active:cursor-grabbing select-none shrink-0"
        >
          <div className="flex items-center gap-2 min-w-0">
            <GripHorizontal size={13} className="text-[#2a3a2a] shrink-0" />
            <span className="text-[#f1e5ac] text-[10px] font-serif italic tracking-widest uppercase truncate">
              {title}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!hideMinimize && (
              <button
                onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                className="text-[#2a3a2a] hover:text-[#4a5a4a] p-1 transition-colors"
              >
                <Minus size={14} />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="text-[#2a3a2a] hover:text-red-400 p-1 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {!isMinimized && (
        <div className="overflow-auto flex-1">
          {children}
        </div>
      )}

      {/* Resize handles */}
      {!isMinimized && (
        <>
          <div onMouseDown={(e) => handleResizeStart('n', e)} className="absolute top-0 left-2 right-2 h-1.5 cursor-n-resize z-10" />
          <div onMouseDown={(e) => handleResizeStart('s', e)} className="absolute bottom-0 left-2 right-2 h-1.5 cursor-s-resize z-10" />
          <div onMouseDown={(e) => handleResizeStart('w', e)} className="absolute top-2 bottom-2 left-0 w-1.5 cursor-w-resize z-10" />
          <div onMouseDown={(e) => handleResizeStart('e', e)} className="absolute top-2 bottom-2 right-0 w-1.5 cursor-e-resize z-10" />
          <div onMouseDown={(e) => handleResizeStart('nw', e)} className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize z-10" />
          <div onMouseDown={(e) => handleResizeStart('ne', e)} className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize z-10" />
          <div onMouseDown={(e) => handleResizeStart('sw', e)} className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize z-10" />
          <div onMouseDown={(e) => handleResizeStart('se', e)} className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize z-10" />
        </>
      )}
    </div>
  );
}
