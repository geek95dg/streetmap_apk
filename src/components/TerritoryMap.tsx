import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Territory } from '../types';

interface TerritoryMapProps {
  territory: Territory;
  interactive?: boolean;
  onCoordinatesChange?: (lat: number, lon: number) => void;
  className?: string;
  zoomControl?: boolean;
}

export const TerritoryMap: React.FC<TerritoryMapProps> = ({
  territory,
  interactive = true,
  onCoordinatesChange,
  className = 'h-52 w-full',
  zoomControl = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const shapeLayerRef = useRef<L.Layer | null>(null);

  const lat = territory.lat ?? 54.1944;
  const lon = territory.lon ?? 16.1722;
  const zoom = territory.zoom || 17;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up previous instance if exists
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Initialize map
    const map = L.map(mapContainerRef.current, {
      center: [lat, lon],
      zoom: zoom,
      zoomControl: zoomControl && interactive,
      dragging: interactive,
      touchZoom: interactive,
      doubleClickZoom: interactive,
      scrollWheelZoom: interactive,
      attributionControl: false,
    });

    mapInstanceRef.current = map;

    // Tile layer: OSM standard
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Custom map marker icon
    const customIcon = L.divIcon({
      className: 'custom-pin-marker',
      html: `
        <div style="
          width: 28px;
          height: 28px;
          background-color: #ef4444;
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 4px 8px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 11px;
        ">
          ${territory.nr || '•'}
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    if (territory.lat && territory.lon) {
      const marker = L.marker([lat, lon], {
        icon: customIcon,
        draggable: interactive && !!onCoordinatesChange,
      }).addTo(map);

      if (interactive && onCoordinatesChange) {
        marker.on('dragend', (e) => {
          const newPos = e.target.getLatLng();
          onCoordinatesChange(newPos.lat, newPos.lng);
        });
      }

      markerRef.current = marker;
    }

    // Render shape if present
    if (territory.shape) {
      try {
        const shapeData = typeof territory.shape === 'string' ? JSON.parse(territory.shape) : territory.shape;
        if (shapeData.kind === 'area' && Array.isArray(shapeData.points)) {
          const polygon = L.polygon(shapeData.points, {
            color: '#2563eb',
            weight: territory.color_edge === '1' ? 3 : 2,
            dashArray: territory.color_edge === '1' ? '6, 6' : undefined,
            fillColor: '#3b82f6',
            fillOpacity: 0.25,
          }).addTo(map);
          shapeLayerRef.current = polygon;
        } else if (shapeData.kind === 'line' && Array.isArray(shapeData.points)) {
          const polyline = L.polyline(shapeData.points, {
            color: '#dc2626',
            weight: 5,
            opacity: 0.85,
            dashArray: territory.color_edge === '1' ? '8, 6' : undefined,
          }).addTo(map);
          shapeLayerRef.current = polyline;
        }
      } catch (err) {
        console.warn('Could not parse shape JSON:', err);
      }
    }

    // Force map redraw to prevent grey boxes
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [lat, lon, zoom, territory.shape, territory.color_edge, territory.nr, interactive]);

  return (
    <div className={`relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100 ${className}`}>
      <div ref={mapContainerRef} className="h-full w-full" />
      
      {!territory.lat && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100/90 p-4 text-center">
          <p className="text-xs font-medium text-slate-500">Brak współrzędnych geograficznych</p>
          <span className="mt-1 text-[11px] text-slate-400">Użyj przycisku „Geokoduj” na kafelku terenu</span>
        </div>
      )}
    </div>
  );
};
