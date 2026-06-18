"use client";
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useToggle } from '@/shared/hooks/useToggle';
import { useParams, useRouter } from 'next/navigation';
import { Map as MapIcon } from 'lucide-react';
import { useMesaSession } from '@/features/mesa/hooks/useMesaSession';
import { useMesaRealtime } from '@/features/mesa/hooks/useMesaRealtime';
import { useMesaRuler } from '@/features/mesa/hooks/useMesaRuler';
import { useMesaTokens } from '@/features/mesa/hooks/useMesaTokens';
import { useMesaMap } from '@/features/mesa/hooks/useMesaMap';
import { useMesaInteraction } from '@/features/mesa/hooks/useMesaInteraction';
import { useMesaSpellCaster } from '@/features/mesa/hooks/useMesaSpellCaster';
import { useTokenSheet } from '@/features/mesa/hooks/useTokenSheet';
import { registerMesaCharacterShortcuts } from '@/features/mesa/utils/mesa-keyboard-shortcuts';
import { buildRealtimeCallbacks } from '@/features/mesa/utils/realtime-callbacks';
import { Token, RollDiceFunc } from '@/features/mesa/types';
import SpellCaster from '@/features/spells/components/spell-caster';
import ChatWidget from '@/features/chat/components/chat-widget';
import CampaignBooksWidget from '@/features/mesa/components/campaign-books-widget';
import DiceRoller from '@/features/mesa/components/dice-roller';
import TokenLibraryWidget from '@/features/mesa/components/token-library-widget';
import TokenLayer from '@/features/mesa/components/TokenLayer';
import PlayerStatusWidget from '@/features/mesa/components/player-status-widget';
import Sidebar from '@/features/mesa/components/Sidebar';
import PlayerListPanel from '@/features/mesa/components/PlayerListPanel';
import RulerBar from '@/features/mesa/components/RulerBar';
import MapRegua from '@/features/mesa/components/MapRegua';
import MesaModals from '@/features/mesa/components/MesaModals';

export default function TelaDeMesa() {
  const router = useRouter();
  const params = useParams();
  // UUID validation — previne SQL injection em queries .or() com campaignId
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const campaignId = params.id as string;

  const {
    currentUserId, currentUserName, isDM, campaignLoaded,
    campaignSettings, fichaCharacterId,
    loadPlayerCharacters,
  } = useMesaSession(campaignId, (initialTokens) => setTokens(initialTokens as Token[]));

  const {
    rulers, visibleRulers, isDraggingRulerRef, getRulerDistance,
    initUserRuler, updateMyRuler, clearMyRuler, toggleMyRuler, clearUserRuler, setRulers,
  } = useMesaRuler();

  const {
    tokenSelecionado, setTokenSelecionado,
    isDraggingToken, setIsDraggingToken,
    dragMovedRef, draggingPosRef, lastBroadcastRef,
    addTokenToMap, handleTokenUpload,
    handleTokenDelete, handleTokenRotate, handleTokenSnap,
  } = useMesaTokens();

  const [tokens, setTokens] = useState<Token[]>([]);
  const tokensRef = useRef<Token[]>([]);
  useEffect(() => { tokensRef.current = tokens; }, [tokens]);

  useEffect(() => {
    if (currentUserId) initUserRuler(currentUserId, currentUserName);
  }, [currentUserId, currentUserName]);

  const {
    mapaUrl, gridSize, gridDistanceInfo, showMapEditor, mapPreviewUrl,
    zoom, offset, isDraggingMap,
    setZoom, setOffset, setIsDraggingMap, setShowMapEditor, setMapPreviewUrl,
    getGridBgStyle, footprintForCategory, getLocalPointFromMouse,
    handleFileUpload, handleMapEditorConfirm,
  } = useMesaMap(campaignId, campaignSettings);

  const mapContentRef = useRef<HTMLDivElement | null>(null);

  // UI state
  const [sidebarAberta, toggleSidebar] = useToggle(true);
  const [modalAtivo, setModalAtivo] = useState<'Mapa' | null>(null);
  const [showTokenLibrary, toggleTokenLibrary, setShowTokenLibrary] = useToggle(false);
  const [showBooks, toggleBooks, setShowBooks] = useToggle(false);
  const [showFicha, , setShowFicha] = useToggle(false);
  const [showSpellModal, , setShowSpellModal] = useToggle(false);
  const [showPlayerList, togglePlayerList, setShowPlayerList] = useToggle(false);
  const [showFichaDM, , setShowFichaDM] = useToggle(false);
  const [modalAjuda, toggleModalAjuda] = useToggle(false);
  const [rollDiceFunc, setRollDiceFunc] = useState<RollDiceFunc | null>(null);
  const [fichaCharacterIdDM, setFichaCharacterIdDM] = useState<number | string | null>(null);
  const [playerCharacters, setPlayerCharacters] = useState<{ id: number; name: string; img: string | null; imgOffsetX: number; imgOffsetY: number }[]>([]);

  // Abrir um painel DM fecha os outros (evita sobreposição)
  const handleTogglePlayerList = useCallback(() => {
    togglePlayerList();
    setShowBooks(false);
    setShowTokenLibrary(false);
  }, [togglePlayerList, setShowBooks, setShowTokenLibrary]);

  const handleToggleBooks = useCallback(() => {
    toggleBooks();
    setShowPlayerList(false);
    setShowTokenLibrary(false);
  }, [toggleBooks, setShowPlayerList, setShowTokenLibrary]);

  const handleToggleTokenLibrary = useCallback(() => {
    toggleTokenLibrary();
    setShowPlayerList(false);
    setShowBooks(false);
  }, [toggleTokenLibrary, setShowPlayerList, setShowBooks]);

  const handleOpenTokenLibrary = useCallback(() => {
    setShowTokenLibrary(true);
    setShowPlayerList(false);
    setShowBooks(false);
  }, [setShowPlayerList, setShowBooks, setShowTokenLibrary]);

  const selectedToken = useMemo(() => {
    if (!tokenSelecionado) return null;
    return tokens.find((token) => token.id === tokenSelecionado) ?? null;
  }, [tokenSelecionado, tokens]);

  const {
    showTokenSheet, tokenSheet, tokenSheetLoading, tokenSheetSaving,
    tokenSheetAutoFillLoading, tokenSheetAutoFillSource, tokenSheetAutoFillError,
    tokenLabel,
    openTokenSheet, handleTokenSheetChange, handleSaveTokenSheet,
    handleAutoFillTokenSheet, handleAutoFillTokenSheetFromText, closeTokenSheet,
  } = useTokenSheet({ tokens, setTokens, campaignId, selectedToken, isDM });

  // realtime
  const fetchPlayerCharacters = useCallback(async () => {
    const chars = await loadPlayerCharacters();
    if (chars.length > 0) setPlayerCharacters(chars);
  }, [loadPlayerCharacters]);

  // Busca inicial (real-time só pega mudanças posteriores)
  useEffect(() => {
    if (campaignLoaded && isDM) fetchPlayerCharacters();
  }, [campaignLoaded, isDM, fetchPlayerCharacters]);

  const realtimeCallbacks = useMemo(() => buildRealtimeCallbacks({
    setTokens, setRulers, fetchPlayerCharacters,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [setTokens, setRulers, fetchPlayerCharacters]);

  const { realtimeChannelRef, broadcast } = useMesaRealtime(campaignId, currentUserId, realtimeCallbacks);

  const {
    handleMouseDown, handleMouseMove, handleMouseUp,
  } = useMesaInteraction({
    currentUserId, currentUserName, isDM, fichaCharacterId,
    rulers, isDraggingRulerRef, updateMyRuler,
    tokenSelecionado, setTokenSelecionado, isDraggingToken, setIsDraggingToken,
    dragMovedRef, draggingPosRef, lastBroadcastRef,
    isDraggingMap, setIsDraggingMap, zoom, setOffset, gridSize, getLocalPointFromMouse,
    tokensRef, setTokens,
    handleTokenSnap, handleTokenRotate, handleTokenDelete,
    realtimeChannelRef, broadcast,
    setShowFicha, setShowFichaDM, setFichaCharacterIdDM,
    campaignId, mapContentRef,
  });

  // shortcuts
  const openCharacterSheet = useCallback(() => {
    if (!fichaCharacterId) { alert('Você não vinculou um personagem a esta mesa!'); return; }
    setShowFicha(true);
  }, [fichaCharacterId, setShowFicha]);

  const openSpellBook = useCallback(() => {
    if (!fichaCharacterId) { alert('Você não vinculou um personagem a esta mesa!'); return; }
    setShowSpellModal(true);
  }, [fichaCharacterId, setShowSpellModal]);

  useEffect(() => {
    return registerMesaCharacterShortcuts({ enabled: !isDM, onOpenCharacterSheet: openCharacterSheet, onOpenSpellBook: openSpellBook });
  }, [isDM, openCharacterSheet, openSpellBook]);

  const {
    activeSpellCast, setActiveSpellCast,
    casterToken, spellCasterTokens,
    handleSpellLaunch, handleSpellCast, handleOpenTokenSheet,
  } = useMesaSpellCaster(
    tokens, fichaCharacterId, tokenSelecionado,
    gridSize, footprintForCategory,
    setTokens, setShowSpellModal, setTokenSelecionado, openTokenSheet,
  );

  return (
    <div className="h-screen w-screen bg-black overflow-hidden flex flex-col relative font-sans select-none text-white">
      <div
        className="flex flex-1 relative overflow-hidden bg-black"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <Sidebar
          sidebarAberta={sidebarAberta}
          isDM={isDM}
          fichaCharacterId={fichaCharacterId}
          showSpellModal={showSpellModal}
          showPlayerList={showPlayerList}
          showBooks={showBooks}
          onHome={() => router.push('/campanhas')}
          onOpenCharacterSheet={openCharacterSheet}
          onOpenSpellBook={openSpellBook}
          onTogglePlayerList={handleTogglePlayerList}
          onToggleBooks={handleToggleBooks}
          onOpenMapUpload={() => setModalAtivo('Mapa')}
          onOpenTokenLibrary={handleOpenTokenLibrary}
          onToggleSidebar={toggleSidebar}
        />

        {isDM && <CampaignBooksWidget campaignId={campaignId} isOpen={showBooks} onToggle={handleToggleBooks} />}
        {isDM && <TokenLibraryWidget isOpen={showTokenLibrary} onToggle={handleToggleTokenLibrary} onAddToken={(t) => addTokenToMap(t, campaignId, setTokens, broadcast)} onUpload={(file) => handleTokenUpload(file, campaignId, setTokens, broadcast)} />}

        {isDM && showPlayerList && (
          <PlayerListPanel
            characters={playerCharacters}
            onSelectCharacter={(id) => { setFichaCharacterIdDM(id); setShowFichaDM(true); setShowPlayerList(false); }}
          />
        )}

        {/* main area */}
        <main
          className="flex-grow relative overflow-hidden bg-black cursor-default"
          onMouseDown={(e) => handleMouseDown(e)}
          onWheel={(e) => {
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            setZoom(prev => Math.min(Math.max(0.1, prev + delta), 5));
          }}
        >
          <RulerBar
            currentUserId={currentUserId}
            currentUserName={currentUserName || ''}
            rulers={rulers}
            gridSize={gridSize}
            gridDistanceInfo={gridDistanceInfo}
            onToggleRuler={toggleMyRuler}
            onClearRuler={clearMyRuler}
            getRulerDistance={getRulerDistance}
            broadcast={broadcast}
          />

          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
              transition: (isDraggingMap || isDraggingToken) ? 'none' : 'transform 0.1s ease-out'
            }}
          >
            <div ref={mapContentRef} className="relative pointer-events-auto">
              {!mapaUrl ? (
                <div className="w-[1000px] h-[800px] flex flex-col items-center justify-center gap-4 text-white/10">
                  <MapIcon size={64} strokeWidth={1} />
                  <span className="text-[10px] uppercase font-black tracking-[0.2em]">Aguardando Mapa...</span>
                </div>
              ) : (
                <img src={mapaUrl} className="max-w-none block opacity-80 shadow-2xl" alt="Map" />
              )}

              <MapRegua
                visibleRulers={visibleRulers}
                currentUserId={currentUserId}
                isDM={isDM}
                rulers={rulers}
                gridSize={gridSize}
                gridDistanceInfo={gridDistanceInfo}
                getRulerDistance={getRulerDistance}
                clearUserRuler={clearUserRuler}
                broadcast={broadcast}
              />

              <div className="absolute inset-0 pointer-events-none" style={getGridBgStyle()} />

              <TokenLayer
                tokens={tokens}
                gridSize={gridSize}
                mapaUrl={mapaUrl}
                tokenSelecionado={tokenSelecionado}
                isDM={isDM}
                footprintForCategory={footprintForCategory}
                onTokenMouseDown={handleMouseDown}
                onOpenTokenSheet={handleOpenTokenSheet}
              />

              <SpellCaster
                isOpen={Boolean(activeSpellCast) && campaignLoaded}
                spell={activeSpellCast}
                campaignId={campaignId}
                tokens={spellCasterTokens}
                casterPoint={casterToken ? { x: casterToken.x, y: casterToken.y } : null}
                gridSize={gridSize} gridValue={gridDistanceInfo.value}
                gridUnit={gridDistanceInfo.unit === 'm' ? 'm' : 'pes'}
                casterLevel={casterToken?.characterId ? 1 : 1} casterModificador={3}
                resolvePoint={(cx, cy) => getLocalPointFromMouse(cx, cy, mapContentRef.current)}
                onClose={() => setActiveSpellCast(null)}
                onSpellCast={handleSpellCast}
                onRollDice={async (formula, secret, mode) => {
                  if (rollDiceFunc) return rollDiceFunc(formula, secret, mode);
                  return null;
                }}
              />
            </div>
          </div>
        </main>

        <div className="z-40 relative">
          <ChatWidget campaignId={campaignId} isDiceReady={!!rollDiceFunc}
            onRollDice={rollDiceFunc ? (type, secret, mode) => rollDiceFunc(type, secret, mode) : (async () => null)} />
        </div>

        <PlayerStatusWidget campaignId={campaignId} isDM={isDM} currentUserId={currentUserId} />
      </div>

      <DiceRoller campaignId={campaignId} isDM={isDM} currentUserId={currentUserId}
        onReady={(func) => setRollDiceFunc(() => func)} />

      <MesaModals
        campaignId={campaignId}
        isDM={isDM}
        rollDiceFunc={rollDiceFunc}

        showFicha={showFicha}
        onCloseFicha={() => setShowFicha(false)}
        fichaCharacterId={fichaCharacterId}

        showSpellModal={showSpellModal}
        onCloseSpellModal={() => setShowSpellModal(false)}
        onLaunchSpell={handleSpellLaunch}

        showTokenSheet={showTokenSheet}
        tokenSheet={tokenSheet}
        tokenSheetLoading={tokenSheetLoading}
        tokenSheetSaving={tokenSheetSaving}
        tokenSheetAutoFillLoading={tokenSheetAutoFillLoading}
        tokenSheetAutoFillSource={tokenSheetAutoFillSource}
        tokenSheetAutoFillError={tokenSheetAutoFillError}
        tokenLabel={tokenLabel ?? null}
        onTokenSheetChange={handleTokenSheetChange}
        onSaveTokenSheet={handleSaveTokenSheet}
        onAutoFillTokenSheet={handleAutoFillTokenSheet}
        onAutoFillTokenSheetFromText={handleAutoFillTokenSheetFromText}
        onCloseTokenSheet={closeTokenSheet}

        showFichaDM={showFichaDM}
        onCloseFichaDM={() => setShowFichaDM(false)}
        fichaCharacterIdDM={fichaCharacterIdDM}

        modalAjuda={modalAjuda}
        onToggleAjuda={toggleModalAjuda}

        modalAtivo={modalAtivo}
        onCloseMapUpload={() => setModalAtivo(null)}
        onMapFileUpload={(e) => handleFileUpload(e, () => setModalAtivo(null))}

        showMapEditor={showMapEditor}
        mapPreviewUrl={mapPreviewUrl}
        onMapEditorConfirm={(gPx, mScale, gColor, gOpacity, gThickness, gDashed, gDashFreq, gDim) =>
          handleMapEditorConfirm(gPx, mScale, gColor, gOpacity, gThickness, gDashed, gDashFreq, gDim, broadcast)}
        onCancelMapEditor={() => { setShowMapEditor(false); setMapPreviewUrl(null); }}
      />
    </div>
  );
}