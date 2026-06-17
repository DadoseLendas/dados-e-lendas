"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { uploadCampaignAsset, updateCampaign } from '@/features/mesa/services/mesa-service';

interface CampaignMapSettings {
  map_url?: string | null;
  map_grid_px?: number | null;
  map_scale?: number | null;
  map_grid_color?: string | null;
  map_grid_opacity?: number | null;
  map_grid_thickness?: number | null;
  map_grid_dashed?: boolean | null;
  map_grid_dash_frequency?: number | null;
  map_grid_dimension?: string | null;
}

interface UseMesaMapReturn {
  mapaUrl: string | null;
  mapGridPx: number;
  mapScale: number;
  gridColor: string;
  gridOpacity: number;
  gridThickness: number;
  gridDashed: boolean;
  gridDashFrequency: number;
  gridDimension: string;
  showMapEditor: boolean;
  mapPreviewUrl: string | null;
  zoom: number;
  offset: { x: number; y: number };
  isDraggingMap: boolean;
  gridSize: number;
  gridDistanceInfo: { value: number; unit: string };

  setZoom: React.Dispatch<React.SetStateAction<number>>;
  setOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  setIsDraggingMap: React.Dispatch<React.SetStateAction<boolean>>;
  setShowMapEditor: React.Dispatch<React.SetStateAction<boolean>>;
  setMapPreviewUrl: React.Dispatch<React.SetStateAction<string | null>>;

  getGridBgStyle: () => Record<string, string>;
  footprintForCategory: (cat?: string) => number;
  getLocalPointFromMouse: (clientX: number, clientY: number, container: HTMLDivElement | null) => { x: number; y: number } | null;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, onUploadComplete?: () => void) => Promise<void>;
  handleMapEditorConfirm: (gridPx: number, mapScale: number, gridColor: string, gridOpacity: number, gridThickness: number, gridDashed: boolean, gridDashFrequency: number, gridDimension: string, broadcast: (event: string, payload: Record<string, unknown>) => void) => Promise<void>;
}

export function useMesaMap(campaignId: string, campaignSettings: CampaignMapSettings | null): UseMesaMapReturn {
  const [mapaUrl, setMapaUrl] = useState<string | null>(null);
  const [mapGridPx, setMapGridPx] = useState<number>(50);
  const [mapScale, setMapScale] = useState<number>(100);
  const [gridColor, setGridColor] = useState<string>('#ffffff');
  const [gridOpacity, setGridOpacity] = useState<number>(0.08);
  const [gridThickness, setGridThickness] = useState<number>(1);
  const [gridDashed, setGridDashed] = useState<boolean>(false);
  const [gridDashFrequency, setGridDashFrequency] = useState<number>(5);
  const [gridDimension, setGridDimension] = useState<string>('5 pes');
  const [showMapEditor, setShowMapEditor] = useState(false);
  const [mapPreviewUrl, setMapPreviewUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDraggingMap, setIsDraggingMap] = useState(false);

  useEffect(() => {
    if (!campaignSettings) return;
    if (campaignSettings.map_url) setMapaUrl(campaignSettings.map_url);
    if (campaignSettings.map_grid_px != null) setMapGridPx(campaignSettings.map_grid_px);
    if (campaignSettings.map_scale != null) setMapScale(campaignSettings.map_scale);
    if (campaignSettings.map_grid_color != null) setGridColor(campaignSettings.map_grid_color);
    if (campaignSettings.map_grid_opacity != null) setGridOpacity(campaignSettings.map_grid_opacity);
    if (campaignSettings.map_grid_thickness != null) setGridThickness(campaignSettings.map_grid_thickness);
    if (campaignSettings.map_grid_dashed != null) setGridDashed(campaignSettings.map_grid_dashed);
    if (campaignSettings.map_grid_dash_frequency != null) setGridDashFrequency(campaignSettings.map_grid_dash_frequency);
    if (campaignSettings.map_grid_dimension != null) setGridDimension(campaignSettings.map_grid_dimension);
  }, [campaignSettings]);

  const gridSize = mapGridPx;

  const gridDistanceInfo = useMemo(() => {
    const match = gridDimension.trim().match(/^([\d.,]+)\s*(.*)$/);
    const value = match ? Number.parseFloat(match[1].replace(',', '.')) : 5;
    const rawUnit = (match?.[2]?.trim() || 'pes').toLowerCase();
    const unit = rawUnit === 'ft' || rawUnit === 'feet' ? 'pes' : rawUnit === 'metro' || rawUnit === 'metros' ? 'm' : rawUnit;
    return {
      value: Number.isFinite(value) && value > 0 ? value : 5,
      unit,
    };
  }, [gridDimension]);

  const footprintForCategory = useCallback((cat?: string) => {
    switch (cat) {
      case 'Tiny': return 0.5;
      case 'Small': return 1;
      case 'Medium': return 1;
      case 'Large': return 2;
      case 'Huge': return 3;
      case 'Gargantuan': return 4;
      default: return 1;
    }
  }, []);

  const getLocalPointFromMouse = useCallback((clientX: number, clientY: number, container: HTMLDivElement | null) => {
    const rect = container?.getBoundingClientRect();
    if (!rect) return null;

    const x = (clientX - rect.left) / zoom;
    const y = (clientY - rect.top) / zoom;

    if (x < 0 || y < 0 || x > rect.width / zoom || y > rect.height / zoom) {
      return null;
    }

    return { x, y };
  }, [zoom]);

  const getGridBgStyle = useCallback(() => {
    const r = parseInt(gridColor.slice(1, 3), 16);
    const g = parseInt(gridColor.slice(3, 5), 16);
    const b = parseInt(gridColor.slice(5, 7), 16);
    const rgba = `rgba(${r}, ${g}, ${b}, ${gridOpacity})`;

    if (gridDashed) {
      const dashSize = Math.max(2, gridSize / gridDashFrequency);
      const svg = `<svg width="${gridSize}" height="${gridSize}" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="0" x2="${gridSize}" y2="0" stroke="${gridColor}" stroke-width="${gridThickness}" stroke-dasharray="${dashSize},${dashSize}" opacity="${gridOpacity}"/>
        <line x1="0" y1="0" x2="0" y2="${gridSize}" stroke="${gridColor}" stroke-width="${gridThickness}" stroke-dasharray="${dashSize},${dashSize}" opacity="${gridOpacity}"/>
      </svg>`;
      return {
        backgroundImage: `url('data:image/svg+xml,${encodeURIComponent(svg)}')`,
        backgroundSize: `${gridSize}px ${gridSize}px`
      };
    }

    return {
      backgroundImage: `linear-gradient(to right, ${rgba} ${gridThickness}px, transparent ${gridThickness}px), linear-gradient(to bottom, ${rgba} ${gridThickness}px, transparent ${gridThickness}px)`,
      backgroundSize: `${gridSize}px ${gridSize}px`
    };
  }, [gridColor, gridOpacity, gridThickness, gridDashed, gridDashFrequency, gridSize]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, onUploadComplete?: () => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop() ?? 'png';
    const fileName = `maps/${campaignId}-map.${ext}`;
    let publicUrl: string;
    try {
      publicUrl = await uploadCampaignAsset(fileName, file);
    } catch (error: any) {
      alert('Erro ao fazer upload do mapa: ' + error.message);
      return;
    }

    setMapPreviewUrl(`${publicUrl}?t=${Date.now()}`);
    setShowMapEditor(true);
    onUploadComplete?.();
    e.target.value = '';
  };

  const handleMapEditorConfirm = async (
    gridPx: number, mapScale: number, gridColor: string, gridOpacity: number,
    gridThickness: number, gridDashed: boolean, gridDashFrequency: number, gridDimension: string,
    broadcast: (event: string, payload: Record<string, unknown>) => void,
  ) => {
    if (!mapPreviewUrl) return;

    setMapGridPx(gridPx);
    setMapScale(mapScale);
    setGridColor(gridColor);
    setGridOpacity(gridOpacity);
    setGridThickness(gridThickness);
    setGridDashed(gridDashed);
    setGridDashFrequency(gridDashFrequency);
    setGridDimension(gridDimension);
    setMapaUrl(mapPreviewUrl);
    setShowMapEditor(false);
    setMapPreviewUrl(null);

    try {
      await updateCampaign(campaignId, {
        map_url: mapPreviewUrl,
        map_grid_px: gridPx,
        map_scale: mapScale,
        map_grid_color: gridColor,
        map_grid_opacity: gridOpacity,
        map_grid_thickness: gridThickness,
        map_grid_dashed: gridDashed,
        map_grid_dash_frequency: gridDashFrequency,
        map_grid_dimension: gridDimension,
      });
    } catch (err) {
      console.error('[MAPA] Erro ao salvar:', err);
    }

    broadcast('map-change', { mapUrl: mapPreviewUrl, gridPx, mapScale, gridColor, gridOpacity, gridThickness, gridDashed, gridDashFrequency, gridDimension });
  };

  return {
    mapaUrl, mapGridPx, mapScale, gridColor, gridOpacity, gridThickness,
    gridDashed, gridDashFrequency, gridDimension, showMapEditor, mapPreviewUrl,
    zoom, offset, isDraggingMap, gridSize, gridDistanceInfo,
    setZoom, setOffset, setIsDraggingMap, setShowMapEditor, setMapPreviewUrl,
    getGridBgStyle, footprintForCategory, getLocalPointFromMouse,
    handleFileUpload, handleMapEditorConfirm,
  };
}
