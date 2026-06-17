'use client';

import { useState } from 'react';
import { getGridBg } from '@/features/map/utils/grid-bg';

interface UseMapEditorOptions {
  onConfirm: (
    gridPx: number,
    mapScale: number,
    gridColor: string,
    gridOpacity: number,
    gridThickness: number,
    gridDashed: boolean,
    gridDashFrequency: number,
    gridDimension: string
  ) => Promise<void>;
}

export function useMapEditor({ onConfirm }: UseMapEditorOptions) {
  const [gridPx, setGridPx] = useState<number>(50);
  const [mapScale, setMapScale] = useState<number>(100);
  const [gridColor, setGridColor] = useState<string>('#ffffff');
  const [gridOpacity, setGridOpacity] = useState<number>(0.08);
  const [gridThickness, setGridThickness] = useState<number>(1);
  const [gridDashed, setGridDashed] = useState<boolean>(false);
  const [gridDashFrequency, setGridDashFrequency] = useState<number>(5);
  const [gridDimension, setGridDimension] = useState<string>('5 pes');
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm(
        gridPx,
        mapScale,
        gridColor,
        gridOpacity,
        gridThickness,
        gridDashed,
        gridDashFrequency,
        gridDimension
      );
    } finally {
      setIsLoading(false);
    }
  };

  const gridBgStyle = getGridBg(gridColor, gridOpacity, gridPx, gridDashed, gridThickness, gridDashFrequency);

  return {
    gridPx,
    setGridPx,
    mapScale,
    setMapScale,
    gridColor,
    setGridColor,
    gridOpacity,
    setGridOpacity,
    gridThickness,
    setGridThickness,
    gridDashed,
    setGridDashed,
    gridDashFrequency,
    setGridDashFrequency,
    gridDimension,
    setGridDimension,
    isLoading,
    handleConfirm,
    gridBgStyle,
  };
}
