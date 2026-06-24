"use client";
import FichaModal from '@/features/character/components/ficha-modal';
import SpellModal from '@/features/spells/components/spell-modal';
import TokenSheetPanel, { TokenSheet } from '@/features/monsters/components/token-sheet-panel';
import MapEditorModal from '@/features/map/components/map-editor-modal';
import MapUploadModal from '@/features/mesa/components/MapUploadModal';
import HelpModal from '@/features/mesa/components/HelpModal';
import { RollDiceFunc } from '@/features/mesa/types';

interface MesaModalsProps {
  campaignId: string;
  isDM: boolean;
  rollDiceFunc: RollDiceFunc | null;

  // ficha do jogador
  showFicha: boolean;
  onCloseFicha: () => void;
  fichaCharacterId: string | number | null;

  // grimório
  showSpellModal: boolean;
  onCloseSpellModal: () => void;
  onLaunchSpell: (spell: any) => void;

  // token sheet (monstro)
  showTokenSheet: boolean;
  tokenSheet: TokenSheet;
  tokenSheetLoading: boolean;
  tokenSheetSaving: boolean;
  tokenSheetAutoFillLoading: boolean;
  tokenSheetAutoFillSource: string | null;
  tokenSheetAutoFillError: string | null;
  tokenLabel: string | null | undefined;
  onTokenSheetChange: (nextSheet: TokenSheet) => void;
  // tokenLabel is null|undefined from useTokenSheet
  onSaveTokenSheet: (sheet?: TokenSheet) => Promise<boolean>;
  onAutoFillTokenSheet: () => Promise<boolean>;
  onAutoFillTokenSheetFromText: (text: string) => Promise<boolean>;
  onCloseTokenSheet: () => void;

  // ficha DM
  showFichaDM: boolean;
  onCloseFichaDM: () => void;
  fichaCharacterIdDM: string | number | null;

  // help
  modalAjuda: boolean;
  onToggleAjuda: () => void;

  // map upload
  modalAtivo: 'Mapa' | null;
  onCloseMapUpload: () => void;
  onMapFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;

  // map editor
  showMapEditor: boolean;
  mapPreviewUrl: string | null;
  onMapEditorConfirm: (gPx: number, mScale: number, gColor: string, gOpacity: number, gThickness: number, gDashed: boolean, gDashFreq: number, gDim: string) => Promise<void>;
  onCancelMapEditor: () => void;
}

export default function MesaModals({
  campaignId, isDM, rollDiceFunc,
  showFicha, onCloseFicha, fichaCharacterId,
  showSpellModal, onCloseSpellModal, onLaunchSpell,
  showTokenSheet, tokenSheet, tokenSheetLoading, tokenSheetSaving,
  tokenSheetAutoFillLoading, tokenSheetAutoFillSource, tokenSheetAutoFillError,
  tokenLabel, onTokenSheetChange, onSaveTokenSheet, onAutoFillTokenSheet,
  onAutoFillTokenSheetFromText, onCloseTokenSheet,
  showFichaDM, onCloseFichaDM, fichaCharacterIdDM,
  modalAjuda, onToggleAjuda,
  modalAtivo, onCloseMapUpload, onMapFileUpload,
  showMapEditor, mapPreviewUrl, onMapEditorConfirm, onCancelMapEditor,
}: MesaModalsProps) {
  return (
    <>
      <MapUploadModal isOpen={modalAtivo === 'Mapa'} onClose={onCloseMapUpload} onFileUpload={onMapFileUpload} />

      {showMapEditor && mapPreviewUrl && (
        <MapEditorModal isOpen={showMapEditor} mapUrl={mapPreviewUrl} campaignId={campaignId}
          onConfirm={onMapEditorConfirm} onCancel={onCancelMapEditor} />
      )}

      {showFicha && fichaCharacterId && (
        <FichaModal isOpen={showFicha} characterId={fichaCharacterId} campaignId={campaignId}
          onClose={onCloseFicha}
          onLaunchSpell={onLaunchSpell}
          onRollDice={rollDiceFunc ?? (async () => null)} />
      )}

      {showFichaDM && fichaCharacterIdDM && (
        <FichaModal isOpen={showFichaDM} characterId={fichaCharacterIdDM} campaignId={campaignId}
          readOnly
          onClose={onCloseFichaDM}
          onRollDice={rollDiceFunc ?? (async () => null)} />
      )}

      {showSpellModal && fichaCharacterId && (
        <SpellModal isOpen={showSpellModal} onClose={onCloseSpellModal}
          characterId={fichaCharacterId} campaignId={campaignId}
          onLaunchSpell={onLaunchSpell} />
      )}

      {showTokenSheet && (
        <TokenSheetPanel
          isOpen={showTokenSheet}
          isDM={isDM}
          sheet={tokenSheet}
          loading={tokenSheetLoading}
          saving={tokenSheetSaving}
          autoFillLoading={tokenSheetAutoFillLoading}
          autoFillSource={tokenSheetAutoFillSource}
          autoFillError={tokenSheetAutoFillError}
          tokenLabel={tokenLabel ?? undefined}
          onChange={onTokenSheetChange}
          onSave={onSaveTokenSheet}
          onAutoFill={onAutoFillTokenSheet}
          onAutoFillFromText={onAutoFillTokenSheetFromText}
          onClose={onCloseTokenSheet}
        />
      )}

      <HelpModal isOpen={modalAjuda} onToggle={onToggleAjuda} />
    </>
  );
}