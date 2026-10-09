"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type Map as MlMap, type MapGeoJSONFeature } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { LAYERS, MAP_CENTER } from "@/lib/constants";
import { moistureColor, ndviColor, priorityColor, stressColor } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BASEMAPS, BASEMAP_META, type BasemapKey } from "@/components/maps/basemaps";
import { Crosshair, Layers, Plus, Minus, MapPin, Eye, Check } from "lucide-react";
import type { Zone } from "@/types";

const LAYER_COLORS: Record<string, (z: Zone) => string> = {
  moisture: (z) => moistureColor(z.moisturePct),
  stress: (z) => stressColor(z.stressRiskPct),
  ndvi: (z) => ndviColor(z.ndvi),
  priority: (z) => priorityColor(z.priority),
};

const LAYER_VALUE: Record<string, (z: Zone) => string> = {
  moisture: (z) => `${z.moisturePct.toFixed(1)}%`,
  stress: (z) => `${z.stressRiskPct}%`,
  ndvi: (z) => z.ndvi.toFixed(2),
  priority: (z) => `P${z.priority}`,
};

export interface FarmMapProps {
  zones: Zone[];
  layer: string;
  onLayerChange?: (l: string) => void;
  selectedZoneId: string | null;
  onZoneSelect: (id: string | null) => void;
  sensors?: Array<{ id: string; zoneId: string; kind: string; position: { coordinates: [number, number] }; lastValue: number }>;
  className?: string;
  showLegend?: boolean;
  basemap?: BasemapKey;
  onBasemapChange?: (b: BasemapKey) => void;
  showBasemapSwitcher?: boolean;
  fieldLabel?: string;
}

const FIELD_GEOM = {
  type: "Polygon",
  coordinates: [
    [
      [81.5205, 16.5458],
      [81.5238, 16.5458],
      [81.5238, 16.5434],
      [81.5205, 16.5434],
      [81.5205, 16.5458],
    ],
  ],
};

const SUPPORTED_BASEMAPS: BasemapKey[] = ["light", "satellite", "topo"];

export function FarmMap({
  zones,
  layer,
  onLayerChange,
  selectedZoneId,
  onZoneSelect,
  sensors = [],
  className,
  showLegend = true,
  basemap,
  onBasemapChange,
  showBasemapSwitcher = true,
  fieldLabel = "Field A",
}: FarmMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const fieldMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState<{ x: number; y: number; z: Zone } | null>(null);
  const [sensorHover, setSensorHover] = useState<{ x: number; y: number; kind: string; value: number } | null>(null);
  const [internalBasemap, setInternalBasemap] = useState<BasemapKey>(basemap ?? "light");
  const [styleEpoch, setStyleEpoch] = useState(0);
  const [overlaysOpen, setOverlaysOpen] = useState(false);
  const [overlays, setOverlays] = useState({
    zones: true,
    sensors: true,
    boundary: true,
  });
  const zonesRef = useRef(zones);
  const onZoneSelectRef = useRef(onZoneSelect);
  const interactRef = useRef(false);
  const fitRef = useRef(false);
  const initialBasemapRef = useRef<BasemapKey>(basemap ?? "light");
  const basemapRef = useRef(basemap ?? "light");
  zonesRef.current = zones;
  onZoneSelectRef.current = onZoneSelect;
  basemapRef.current = basemap ?? internalBasemap;
  const activeBasemap = basemap ?? internalBasemap;

  const zoneFc = useMemo<GeoJSON.FeatureCollection>(() => {
    return {
      type: "FeatureCollection",
      features: zones.map((z) => ({
        type: "Feature",
        geometry: z.geometry as unknown as GeoJSON.Polygon,
        properties: {
          id: z.id,
          name: z.name,
          color: LAYER_COLORS[layer]?.(z) ?? moistureColor(z.moisturePct),
          selected: z.id === selectedZoneId,
          dimmed: selectedZoneId !== null && z.id !== selectedZoneId,
          label: z.name.replace("Zone ", "Zone "),
        },
      })),
    };
  }, [zones, layer, selectedZoneId]);

  const sensorFc = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: sensors.map((s) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: s.position.coordinates } as GeoJSON.Point,
        properties: { id: s.id, kind: s.kind, value: s.lastValue },
      })),
    }),
    [sensors],
  );

  // init map — basemap from the Sih-HailStrom reference set, deferred so
  // route transitions don't stutter
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    const timer = setTimeout(() => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: BASEMAPS[initialBasemapRef.current],
        center: MAP_CENTER,
        zoom: 15,
        attributionControl: {},
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
      map.on("load", () => setReady(true));
    }, 40);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Basemap switching — ported from the reference WeatherMap. setStyle wipes
  // every source/layer, so a styleEpoch bump re-runs the data effects and
  // re-paints zones, sensors, labels and context parcels on the new basemap.
  const handleBasemapChange = (key: BasemapKey) => {
    if (key === activeBasemap) return;
    if (!basemap) setInternalBasemap(key);
    onBasemapChange?.(key);
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(BASEMAPS[key]);
    map.once("style.load", () => setStyleEpoch((e) => e + 1));
  };

  // surrounding terrain context: subtle parcels + a farm track, drawn under the field
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || map.getSource("context")) return;

    const contextFc: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        // neighboring field parcels
        poly([[81.5172, 16.5432], [81.519, 16.5432], [81.519, 16.5466], [81.5172, 16.5466]], "#E2E9E0"),
        poly([[81.5235, 16.5432], [81.5255, 16.5432], [81.5255, 16.5466], [81.5235, 16.5466]], "#E2E9E0"),
        poly([[81.5172, 16.5472], [81.5255, 16.5472], [81.5255, 16.5502], [81.5172, 16.5502]], "#E6EDE4"),
        poly([[81.5172, 16.5395], [81.5255, 16.5395], [81.5255, 16.5426], [81.5172, 16.5426]], "#E6EDE4"),
        // farm track below the field
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [[81.5168, 16.5428], [81.5212, 16.5425], [81.5258, 16.5429]],
          },
        },
      ],
    };
    function poly(ring: number[][], color: string): GeoJSON.Feature {
      return {
        type: "Feature",
        properties: { color },
        geometry: { type: "Polygon", coordinates: [[...ring, ring[0]]] },
      } as GeoJSON.Feature;
    }

    map.addSource("context", { type: "geojson", data: contextFc });
    map.addLayer({ id: "context-fill", type: "fill", source: "context", paint: { "fill-color": ["get", "color"], "fill-opacity": 1 } });
    map.addLayer({
      id: "context-track",
      type: "line",
      source: "context",
      filter: ["==", ["geometry-type"], "LineString"],
      paint: { "line-color": "#D3CFC2", "line-width": 3 },
    });
  }, [ready, styleEpoch]);

  // field + zones + sensors + labels.
  // NOTE: sources are created only once real features exist — creating a GeoJSON
  // source with an empty FeatureCollection and calling setData later leaves the
  // source un-tiled in MapLibre v4 (queryRenderedFeatures stays empty), so the
  // zone polygons never paint. We wait for data, then add source + layers once.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    if (!map.getSource("field")) {
      map.addSource("field", { type: "geojson", data: FIELD_GEOM as unknown as GeoJSON.Polygon });
      map.addLayer({
        id: "field-line",
        type: "line",
        source: "field",
        paint: { "line-color": "#8FA694", "line-width": 2 },
      });
    }

    if (zoneFc.features.length > 0 && !map.getSource("zones")) {
      map.addSource("zones", { type: "geojson", data: zoneFc, promoteId: "id" });
      map.addLayer({
        id: "zone-fill",
        type: "fill",
        source: "zones",
        paint: {
          "fill-color": ["get", "color"],
          // REST → HOVER → SELECTED → DIMMED, all expressed in paint so MapLibre
          // transitions them smoothly instead of React re-rendering the map.
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false], 0.95,
            ["==", ["get", "dimmed"], true], 0.4,
            ["==", ["get", "selected"], true], 0.92,
            0.78,
          ],
        },
      });
      map.addLayer({
        id: "zone-line",
        type: "line",
        source: "zones",
        paint: {
          "line-color": [
            "case",
            ["boolean", ["feature-state", "hover"], false], "#2F6B58",
            ["==", ["get", "selected"], true], "#1D493D",
            "#FFFFFF",
          ],
          "line-width": [
            "case",
            ["boolean", ["feature-state", "hover"], false], 2.25,
            ["==", ["get", "selected"], true], 2.5,
            1.5,
          ],
        },
      });
      // Smooth paint transitions — layer switches and selection changes glide
      // instead of snapping (professional GIS feel).
      map.setPaintProperty("zone-fill", "fill-color-transition", { duration: 280, delay: 0 });
      map.setPaintProperty("zone-fill", "fill-opacity-transition", { duration: 200, delay: 0 });
      map.setPaintProperty("zone-line", "line-color-transition", { duration: 200, delay: 0 });
      map.setPaintProperty("zone-line", "line-width-transition", { duration: 200, delay: 0 });
    }

    if (sensorFc.features.length > 0 && !map.getSource("sensors")) {
      map.addSource("sensors", { type: "geojson", data: sensorFc, promoteId: "id" });
      map.addLayer({
        id: "sensor-halo",
        type: "circle",
        source: "sensors",
        paint: { "circle-radius": ["case", ["boolean", ["feature-state", "hover"], false], 9, 7], "circle-color": "#FFFFFF", "circle-opacity": 0.9 },
      });
      map.addLayer({
        id: "sensor-dot",
        type: "circle",
        source: "sensors",
        paint: { "circle-radius": ["case", ["boolean", ["feature-state", "hover"], false], 4.5, 3.5], "circle-color": "#4D7EA8" },
      });
      map.setPaintProperty("sensor-halo", "circle-radius-transition", { duration: 150, delay: 0 });
      map.setPaintProperty("sensor-dot", "circle-radius-transition", { duration: 150, delay: 0 });
    }

    if (zoneFc.features.length > 0 && !map.getLayer("zone-labels")) {
      // On dark raster basemaps (satellite / thermal / topo) labels flip to
      // white with a dark halo so they stay legible over imagery.
      const darkBase = basemapRef.current !== "light";
      map.addLayer({
        id: "zone-labels",
        type: "symbol",
        source: "zones",
        layout: {
          "symbol-placement": "point",
          "text-field": ["get", "label"],
          // NOTE: font must be a stack demotiles.maplibre.org actually serves —
          // an unmatched stack 404s its glyph request and MapLibre v4 then never
          // tiles the source, which blanks the zone fills/lines as well.
          "text-font": ["Open Sans Semibold"],
          "text-size": 12,
          "text-letter-spacing": 0.05,
        },
        paint: {
          "text-color": darkBase ? "#FFFFFF" : "#1D493D",
          "text-halo-color": darkBase ? "rgba(22, 58, 49, 0.85)" : "#FFFFFF",
          "text-halo-width": 1.4,
        },
      });
    }

    // keep sources in sync on later renders (layer switch, selection, live data)
    if (map.getSource("zones")) (map.getSource("zones") as maplibregl.GeoJSONSource).setData(zoneFc);
    if (map.getSource("sensors")) (map.getSource("sensors") as maplibregl.GeoJSONSource).setData(sensorFc);

    // Initial fit to field bounds
    if (!fitRef.current && ready) {
      fitRef.current = true;
      fitFieldBounds();
    }

    // interactions — registered once, reading latest data via refs
    if (!interactRef.current && map.getLayer("zone-fill")) {
      interactRef.current = true;
      let hoveredId: string | number | null = null;
      let hoveredSensorId: string | number | null = null;
      const setHoverState = (id: string | number | null) => {
        if (hoveredId !== null && id !== hoveredId) {
          try {
            map.setFeatureState({ source: "zones", id: hoveredId }, { hover: false });
          } catch {
            /* feature may have been removed by a layer switch */
          }
        }
        if (id !== null) {
          try {
            map.setFeatureState({ source: "zones", id }, { hover: true });
          } catch {
            /* ignore */
          }
        }
        hoveredId = id;
      };
      map.on("mousemove", "zone-fill", (e) => {
        map.getCanvas().style.cursor = "pointer";
        const f = e.features?.[0] as MapGeoJSONFeature | undefined;
        const z = zonesRef.current.find((zz) => zz.id === f?.properties?.id);
        if (z && e.point) {
          setHoverState(f!.id ?? null);
          setHover({ x: e.point.x, y: e.point.y, z });
        }
      });
      map.on("mouseleave", "zone-fill", () => {
        map.getCanvas().style.cursor = "";
        setHoverState(null);
        setHover(null);
      });
      map.on("click", "zone-fill", (e) => {
        const f = e.features?.[0] as MapGeoJSONFeature | undefined;
        if (f?.properties?.id) onZoneSelectRef.current(f.properties.id as string);
      });

      // Sensor hover — same tooltip treatment as zones.
      map.on("mousemove", "sensor-dot", (e) => {
        map.getCanvas().style.cursor = "pointer";
        const f = e.features?.[0] as MapGeoJSONFeature | undefined;
        if (f && e.point) {
          const sid = f.id ?? null;
          if (hoveredSensorId !== sid) {
            if (hoveredSensorId !== null) {
              try { map.setFeatureState({ source: "sensors", id: hoveredSensorId }, { hover: false }); } catch { /* noop */ }
            }
            if (sid !== null) {
              try { map.setFeatureState({ source: "sensors", id: sid }, { hover: true }); } catch { /* noop */ }
            }
            hoveredSensorId = sid;
          }
          setSensorHover({
            x: e.point.x,
            y: e.point.y,
            kind: (f.properties?.kind as string) ?? "sensor",
            value: Number(f.properties?.value ?? 0),
          });
        }
      });
      map.on("mouseleave", "sensor-dot", () => {
        if (hoveredSensorId !== null) {
          try { map.setFeatureState({ source: "sensors", id: hoveredSensorId }, { hover: false }); } catch { /* noop */ }
          hoveredSensorId = null;
        }
        setSensorHover(null);
      });
    }
  }, [ready, styleEpoch, zoneFc, sensorFc]);

  // Field centroid marker with popup — adapted from the reference's storm
  // centroid marker. Markers are DOM elements, so they survive style switches.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    if (fieldMarkerRef.current) {
      fieldMarkerRef.current.remove();
      fieldMarkerRef.current = null;
    }

    const avgMoisture = zones.length ? zones.reduce((s, z) => s + z.moisturePct, 0) / zones.length : 0;
    const avgStress = zones.length ? zones.reduce((s, z) => s + z.stressRiskPct, 0) / zones.length : 0;
    const totalNeed = zones.reduce((s, z) => s + z.waterRequirementL, 0);

    const el = document.createElement("div");
    el.innerHTML = `
      <div style="position: relative; width: 11px; height: 11px; cursor: pointer;">
        <span class="pulsing-dot" style="position: absolute; inset: -5px; border-radius: 9999px; border: 2px solid rgba(40, 116, 95, 0.55);"></span>
        <span style="position: absolute; inset: 0; border-radius: 9999px; background: #28745F; border: 2.5px solid #ffffff; box-shadow: 0 1px 5px rgba(22, 58, 49, 0.45);"></span>
        <span style="position: absolute; left: 17px; top: 50%; transform: translateY(-50%); background: rgba(255, 255, 255, 0.96); border: 1px solid #DDE6E1; border-radius: 8px; padding: 3px 9px; font-size: 11px; font-weight: 700; color: #163A31; box-shadow: 0 2px 8px rgba(22, 58, 49, 0.12); white-space: nowrap; font-family: inherit;">${fieldLabel}</span>
      </div>
    `;

    const popupHtml = `
      <div style="padding: 2px 4px; min-width: 200px;">
        <div style="font-weight: 700; color: #163A31; font-size: 13px; margin-bottom: 5px;">${fieldLabel}</div>
        <div style="font-size: 12px; line-height: 1.8; color: #60746C;">
          <div style="display: flex; justify-content: space-between; gap: 18px;"><span>Irrigation zones</span><strong style="color: #163A31;">${zones.length}</strong></div>
          <div style="display: flex; justify-content: space-between; gap: 18px;"><span>Avg moisture</span><strong style="color: #163A31;">${avgMoisture.toFixed(1)}%</strong></div>
          <div style="display: flex; justify-content: space-between; gap: 18px;"><span>Avg stress risk</span><strong style="color: #163A31;">${avgStress.toFixed(0)}%</strong></div>
          <div style="display: flex; justify-content: space-between; gap: 18px;"><span>Total water need</span><strong style="color: #163A31;">${totalNeed.toLocaleString("en-US")} L</strong></div>
        </div>
      </div>
    `;

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat(MAP_CENTER)
      .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(popupHtml))
      .addTo(map);
    fieldMarkerRef.current = marker;

    return () => {
      if (fieldMarkerRef.current) {
        fieldMarkerRef.current.remove();
        fieldMarkerRef.current = null;
      }
    };
  }, [ready, zones, fieldLabel]);

  // Recenter / fit field bounds
  const fitFieldBounds = () => {
    const map = mapRef.current;
    if (!map) return;
    let lons: number[] = [];
    let lats: number[] = [];
    if (zones.length > 0) {
      zones.forEach((z) => {
        const ring = z.geometry?.coordinates?.[0];
        if (Array.isArray(ring)) {
          ring.forEach(([lon, lat]) => {
            if (typeof lon === "number" && typeof lat === "number") {
              lons.push(lon);
              lats.push(lat);
            }
          });
        }
      });
    }
    if (lons.length === 0) {
      const coords = (FIELD_GEOM.coordinates[0] as [number, number][]).slice(0, 4);
      lons = coords.map((c) => c[0]);
      lats = coords.map((c) => c[1]);
    }
    map.fitBounds(
      [
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)],
      ],
      { padding: 48, duration: 500, maxZoom: 16.5 },
    );
  };

  // Keep overlay visibility in sync with the map (incl. after style switches)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !map.isStyleLoaded()) return;
    const setVis = (layerId: string, visible: boolean) => {
      if (map.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
    };
    setVis("zone-fill", overlays.zones);
    setVis("zone-line", overlays.zones);
    setVis("zone-labels", overlays.zones);
    setVis("sensor-halo", overlays.sensors);
    setVis("sensor-dot", overlays.sensors);
    setVis("field-line", overlays.boundary);
    setVis("context-fill", overlays.boundary);
    setVis("context-track", overlays.boundary);
  }, [overlays, ready, styleEpoch]);

  const selectedZone = zones.find((z) => z.id === selectedZoneId);

  return (
    <div className={cn("relative h-full w-full overflow-hidden rounded-xl border border-line bg-[#EDF2EC]", className)}>
      {/* Map canvas */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Top Bar: Clean unified GIS control header */}
      <div className="absolute inset-x-3 top-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Analysis Layer selector */}
        {onLayerChange ? (
          <div className="pointer-events-auto flex items-center gap-0.5 rounded-lg border border-line/90 bg-white/95 p-1 shadow-card backdrop-blur-md">
            {LAYERS.map((l) => (
              <button
                key={l.key}
                type="button"
                onClick={() => onLayerChange(l.key)}
                aria-pressed={layer === l.key}
                className={cn(
                  "rounded-md px-2.5 py-1 text-tiny font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                  layer === l.key
                    ? "bg-brand text-white shadow-sm font-semibold"
                    : "text-ink-muted hover:bg-subtle/80 hover:text-ink",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        ) : <div />}

        {/* Right: Basemap + Utilities */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          {/* Basemap segmented control */}
          {showBasemapSwitcher ? (
            <div className="flex items-center gap-0.5 rounded-lg border border-line/90 bg-white/95 p-1 shadow-card backdrop-blur-md">
              {SUPPORTED_BASEMAPS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleBasemapChange(key)}
                  aria-pressed={activeBasemap === key}
                  title={BASEMAP_META[key].label}
                  className={cn(
                    "rounded-md px-2 py-1 text-micro font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                    activeBasemap === key
                      ? "bg-brand-light font-semibold text-brand-dark shadow-sm"
                      : "text-ink-muted hover:text-ink hover:bg-subtle/70",
                  )}
                >
                  {BASEMAP_META[key].short}
                </button>
              ))}
            </div>
          ) : null}

          {/* Map utilities toolbar */}
          <div className="relative flex items-center gap-0.5 rounded-lg border border-line/90 bg-white/95 p-1 shadow-card backdrop-blur-md">
            {/* Overlays toggle button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOverlaysOpen((v) => !v)}
                title="Layer Overlays"
                aria-label="Toggle map overlays"
                className={cn(
                  "flex h-7 items-center gap-1 rounded-md px-2 text-micro font-medium transition-colors hover:bg-subtle focus-visible:outline-none",
                  overlaysOpen ? "bg-subtle text-ink font-semibold" : "text-ink-muted",
                )}
              >
                <Layers size={13} className="text-brand" />
                <span className="hidden sm:inline">Layers</span>
              </button>

              {overlaysOpen && (
                <div className="absolute right-0 top-8 z-30 w-44 rounded-xl border border-line bg-white p-2 shadow-pop">
                  <div className="mb-1.5 px-2 text-micro font-semibold uppercase tracking-wider text-ink-muted">
                    Map Layers
                  </div>
                  {[
                    { key: "zones" as const, label: "Irrigation Zones" },
                    { key: "sensors" as const, label: "Soil Sensors" },
                    { key: "boundary" as const, label: "Field Boundary" },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setOverlays((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-tiny text-ink hover:bg-subtle"
                    >
                      <span>{item.label}</span>
                      {overlays[item.key] ? (
                        <Check size={13} className="text-brand" />
                      ) : (
                        <span className="h-3 w-3 rounded border border-line" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <span className="h-4 w-px bg-line/80 mx-0.5" />

            {/* Recenter Field */}
            <button
              type="button"
              onClick={fitFieldBounds}
              title="Recenter field"
              aria-label="Recenter field bounds"
              className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-subtle hover:text-ink focus-visible:outline-none"
            >
              <Crosshair size={13} />
            </button>

            {/* Zoom In */}
            <button
              type="button"
              onClick={() => mapRef.current?.zoomIn()}
              title="Zoom in"
              aria-label="Zoom in"
              className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-subtle hover:text-ink focus-visible:outline-none"
            >
              <Plus size={13} />
            </button>

            {/* Zoom Out */}
            <button
              type="button"
              onClick={() => mapRef.current?.zoomOut()}
              title="Zoom out"
              aria-label="Zoom out"
              className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-subtle hover:text-ink focus-visible:outline-none"
            >
              <Minus size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Legend (Bottom-Left) */}
      {showLegend && zones.length > 0 ? (
        <div className="absolute bottom-3 left-3 z-10 rounded-lg border border-line/90 bg-white/95 px-3 py-2 shadow-card backdrop-blur-md">
          {layer === "moisture" ? (
            <>
              <div className="mb-1 text-micro font-semibold text-ink-soft">Soil moisture</div>
              <div className="flex items-center gap-2 text-micro text-ink-muted">
                <span>Dry (&lt;20%)</span>
                <span
                  className="h-1.5 w-24 rounded"
                  style={{ background: "linear-gradient(90deg,#D97B4A,#D9A441,#A9C08D,#7FAF8C,#5E9678)" }}
                />
                <span>Wet (&gt;32%)</span>
              </div>
            </>
          ) : layer === "stress" ? (
            <>
              <div className="mb-1 text-micro font-semibold text-ink-soft">Crop stress risk</div>
              <div className="flex gap-3 text-micro text-ink-muted">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-success" />Low (&lt;15%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-warning" />Moderate
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-danger" />High (&gt;30%)
                </span>
              </div>
            </>
          ) : layer === "ndvi" ? (
            <>
              <div className="mb-1 text-micro font-semibold text-ink-soft">Vegetation health (Sentinel-2 NDVI)</div>
              <div className="flex items-center gap-2 text-micro text-ink-muted">
                <span>0.4 (Sparse)</span>
                <span
                  className="h-1.5 w-24 rounded"
                  style={{ background: "linear-gradient(90deg,#C08552,#D9A441,#A9C08D,#5E9678)" }}
                />
                <span>0.8+ (Dense)</span>
              </div>
            </>
          ) : (
            <>
              <div className="mb-1 text-micro font-semibold text-ink-soft">Irrigation priority</div>
              <div className="flex gap-3 text-micro text-ink-muted">
                {[1, 2, 3, 4].map((p) => (
                  <span key={p} className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm" style={{ background: priorityColor(p) }} />
                    P{p}
                  </span>
                ))}
              </div>
            </>
          )}
          <div className="mt-1.5 flex items-center gap-3 border-t border-line/80 pt-1 text-micro text-ink-muted">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-info" /> Sensor
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm border border-[#8FA694]" /> Field boundary
            </span>
          </div>
        </div>
      ) : null}

      {/* Selected Zone Pill (Bottom-Right) */}
      {selectedZone ? (
        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2 rounded-lg border border-brand/30 bg-brand-light/95 px-3 py-1.5 text-tiny font-medium text-brand-dark shadow-card backdrop-blur-md">
          <span>Inspecting {selectedZone.name}</span>
          <button
            type="button"
            onClick={() => onZoneSelect(null)}
            className="rounded bg-white/70 px-1.5 py-0.5 text-micro font-semibold text-brand hover:bg-white"
          >
            Clear
          </button>
        </div>
      ) : null}

      {/* Tooltip on hover */}
      {hover ? (
        <div
          className="pointer-events-none absolute z-20 w-52 rounded-lg border border-line bg-white/95 p-3 text-tiny shadow-pop backdrop-blur-md"
          style={{
            left: Math.min(hover.x + 12, (containerRef.current?.clientWidth ?? 400) - 220),
            top: hover.y + 12,
          }}
        >
          <div className="mb-1.5 text-[13px] font-semibold text-ink">{hover.z.name}</div>
          {[
            ["Soil moisture", `${hover.z.moisturePct.toFixed(1)}%`],
            ["Crop stress", `${hover.z.stressRiskPct}%`],
            ["Water need", `${hover.z.waterRequirementL} L`],
            ["Layer value", LAYER_VALUE[layer]?.(hover.z) ?? "—"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-0.5">
              <span className="text-ink-muted">{k}</span>
              <span className="font-semibold text-ink">{v}</span>
            </div>
          ))}
        </div>
      ) : null}

      {/* Sensor hover tooltip */}
      {sensorHover ? (
        <div
          className="pointer-events-none absolute z-20 rounded-lg border border-line bg-white/95 px-3 py-2 text-tiny shadow-pop backdrop-blur-md"
          style={{
            left: Math.min(sensorHover.x + 12, (containerRef.current?.clientWidth ?? 400) - 160),
            top: sensorHover.y + 12,
          }}
        >
          <div className="font-medium capitalize text-ink">{sensorHover.kind.replace(/_/g, " ")}</div>
          <div className="text-ink-muted">
            Telemetry reading: <span className="font-semibold text-ink">{sensorHover.value.toFixed(1)}</span>
            {sensorHover.kind.includes("moisture") ? "%" : sensorHover.kind.includes("temp") ? "°C" : ""}
          </div>
        </div>
      ) : null}

      {/* Empty State when no zones exist */}
      {ready && zones.length === 0 ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-subtle/85 p-6 text-center backdrop-blur-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-surface text-ink-muted shadow-sm">
            <MapPin size={22} className="text-brand" />
          </div>
          <h4 className="mt-3 text-sm font-bold text-ink">Field Geometry Not Configured</h4>
          <p className="mt-1 max-w-xs text-tiny text-ink-muted leading-relaxed">
            No irrigation zones are currently configured for this field. Telemetry will project once field zones are registered.
          </p>
        </div>
      ) : null}

      {/* Loading indicator */}
      {!ready ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-subtle text-tiny text-ink-muted">
          Loading field map…
        </div>
      ) : null}
    </div>
  );
}
