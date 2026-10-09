"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type Map as MlMap, type MapGeoJSONFeature } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { LAYERS, MAP_CENTER } from "@/lib/constants";
import { moistureColor, ndviColor, priorityColor, stressColor } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BASEMAPS, BASEMAP_META, type BasemapKey } from "@/components/maps/basemaps";
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
  /** Basemap shown initially; uncontrolled when omitted. */
  basemap?: BasemapKey;
  onBasemapChange?: (b: BasemapKey) => void;
  showBasemapSwitcher?: boolean;
  /** Animated telemetry sweep overlay (ported from the Sih-HailStrom radar sweep). */
  showSweep?: boolean;
  /** Label rendered on the field centroid marker + popup. */
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

const OVERLAY_META = [
  { key: "zones", label: "Zones", dot: "#28745F" },
  { key: "sensors", label: "Sensors", dot: "#537D9B" },
  { key: "sweep", label: "Sweep", dot: "#B98227" },
  { key: "boundary", label: "Boundary", dot: "#8A9A92" },
] as const;

type OverlayKey = (typeof OVERLAY_META)[number]["key"];

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
  showSweep = true,
  fieldLabel = "Field A",
}: FarmMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const sweepCanvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef(0);
  const sweepAngleRef = useRef(0);
  const fieldMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState<{ x: number; y: number; z: Zone } | null>(null);
  const [sensorHover, setSensorHover] = useState<{ x: number; y: number; kind: string; value: number } | null>(null);
  const [internalBasemap, setInternalBasemap] = useState<BasemapKey>(basemap ?? "light");
  const [styleEpoch, setStyleEpoch] = useState(0);
  const [overlays, setOverlays] = useState<Record<OverlayKey, boolean>>({
    zones: true,
    sensors: true,
    sweep: showSweep,
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

  // init map — basemap from the Sih-HailStrom reference set, fit to field once zones arrive
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
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
    return () => {
      map.remove();
      mapRef.current = null;
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

    // fit to field bounds once, when the field geometry is on the map
    if (!fitRef.current) {
      fitRef.current = true;
      const coords = (FIELD_GEOM.coordinates[0] as [number, number][]).slice(0, 4);
      const lons = coords.map((c) => c[0]);
      const lats = coords.map((c) => c[1]);
      map.fitBounds(
        [
          [Math.min(...lons), Math.min(...lats)],
          [Math.max(...lons), Math.max(...lats)],
        ],
        { padding: 56, duration: 600, maxZoom: 17 },
      );
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

  // Size the sweep canvas to the container (device pixels for crisp rendering)
  useEffect(() => {
    const canvas = sweepCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = Math.max(1, Math.floor(container.clientWidth * dpr));
      canvas.height = Math.max(1, Math.floor(container.clientHeight * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Animated telemetry sweep overlay — ported from the Sih-HailStrom radar
  // sweep: range rings, crosshairs and a phosphor-persistence beam that
  // tracks the field centroid on screen.
  useEffect(() => {
    const canvas = sweepCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (overlays.sweep) {
        const u = Math.min(window.devicePixelRatio || 1, 2);
        const map = mapRef.current;
        let cx = w / 2;
        let cy = h / 2;
        if (map) {
          // Beam pivot follows the field centroid even when the user pans.
          const p = map.project(MAP_CENTER);
          cx = p.x * u;
          cy = p.y * u;
        }
        const radius = Math.min(w, h) * 0.44;

        sweepAngleRef.current = (sweepAngleRef.current + 0.028) % (2 * Math.PI);
        const angle = sweepAngleRef.current;

        // Range rings (25 / 50 / 75 / 100% of sweep radius)
        ctx.strokeStyle = "rgba(47, 107, 88, 0.13)";
        ctx.lineWidth = u;
        for (let r = 0.25; r <= 1.0; r += 0.25) {
          ctx.beginPath();
          ctx.arc(cx, cy, radius * r, 0, 2 * Math.PI);
          ctx.stroke();
        }

        // Crosshairs
        ctx.beginPath();
        ctx.moveTo(cx - radius, cy);
        ctx.lineTo(cx + radius, cy);
        ctx.moveTo(cx, cy - radius);
        ctx.lineTo(cx, cy + radius);
        ctx.stroke();

        // Sweeping beam with trailing phosphor persistence
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, angle - 0.4, angle);
        ctx.closePath();
        ctx.fillStyle = "rgba(83, 125, 155, 0.13)";
        ctx.fill();

        // Leading edge bright line
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
        ctx.strokeStyle = "rgba(40, 116, 95, 0.85)";
        ctx.lineWidth = 2 * u;
        ctx.shadowColor = "#28745F";
        ctx.shadowBlur = 10 * u;
        ctx.stroke();
        ctx.restore();
      }

      frame = requestAnimationFrame(render);
    };
    render();

    return () => cancelAnimationFrame(frame);
  }, [overlays.sweep]);

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

  return (
    <div className={cn("relative h-full w-full overflow-hidden rounded-xl2 border border-line bg-[#EDF2EC]", className)}>
      {/* Map canvas */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Animated telemetry sweep overlay */}
      <canvas
        ref={sweepCanvasRef}
        className="pointer-events-none absolute inset-0 z-[4] h-full w-full opacity-90"
      />

      {/* Basemap + data layer switchers (top-left) */}
      <div className="absolute left-3 top-3 z-10 flex flex-col gap-2">
        {showBasemapSwitcher ? (
          <div className="flex items-center gap-0.5 rounded-lg border border-line bg-white/95 p-1 shadow-card backdrop-blur">
            {(Object.keys(BASEMAPS) as BasemapKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleBasemapChange(key)}
                aria-pressed={activeBasemap === key}
                title={BASEMAP_META[key].label}
                className={cn(
                  "rounded-md px-2 py-1 text-micro font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                  activeBasemap === key ? "bg-brand-light text-brand-dark" : "text-ink-muted hover:text-ink",
                )}
              >
                {BASEMAP_META[key].short}
              </button>
            ))}
          </div>
        ) : null}

        {/* Layer selector */}
        {onLayerChange ? (
          <div className="flex flex-wrap gap-0.5 rounded-lg border border-line bg-white/95 p-1 shadow-card backdrop-blur">
            {LAYERS.map((l) => (
              <button
                key={l.key}
                onClick={() => onLayerChange(l.key)}
                aria-pressed={layer === l.key}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-tiny font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                  layer === l.key ? "bg-brand-light text-brand-dark" : "text-ink-muted hover:text-ink",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Overlay toggles (top-right) */}
      <div className="absolute right-3 top-3 z-10 flex max-w-[46%] flex-wrap justify-end gap-1.5">
        {OVERLAY_META.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => setOverlays((prev) => ({ ...prev, [o.key]: !prev[o.key] }))}
            aria-pressed={overlays[o.key]}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-micro font-semibold shadow-card backdrop-blur transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
              overlays[o.key] ? "border-line bg-white/95 text-ink" : "border-line bg-white/70 text-ink-faint hover:text-ink-muted",
            )}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: o.dot, opacity: overlays[o.key] ? 1 : 0.35 }}
            />
            {o.label}
          </button>
        ))}
      </div>

      {/* Active basemap chip (top-center) */}
      <div className="absolute left-1/2 top-3 z-10 hidden -translate-x-1/2 items-center gap-2 rounded-full border border-line bg-white/95 px-3.5 py-1.5 shadow-card backdrop-blur sm:flex">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
        <span className="text-micro font-bold uppercase tracking-wider text-ink">
          {BASEMAP_META[activeBasemap].chip}
        </span>
      </div>

      {/* Legend */}
      {showLegend ? (
        <div className="absolute bottom-3 left-3 z-10 rounded-lg border border-line bg-white/95 px-3 py-2.5 shadow-card backdrop-blur">
          {layer === "moisture" ? (
            <>
              <div className="mb-1 text-micro font-medium text-ink-soft">Soil moisture</div>
              <div className="flex items-center gap-2 text-micro text-ink-muted">
                <span>Dry</span>
                <span className="h-1.5 w-24 rounded" style={{ background: "linear-gradient(90deg,#D97B4A,#D9A441,#A9C08D,#7FAF8C,#5E9678)" }} />
                <span>Wet</span>
              </div>
            </>
          ) : layer === "stress" ? (
            <>
              <div className="mb-1 text-micro font-medium text-ink-soft">Crop stress risk</div>
              <div className="flex gap-3 text-micro text-ink-muted">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-success" />Low</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-warning" />Moderate</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-danger" />High</span>
              </div>
            </>
          ) : layer === "ndvi" ? (
            <>
              <div className="mb-1 text-micro font-medium text-ink-soft">Vegetation health <span className="font-normal text-ink-faint">· satellite layer</span></div>
              <div className="flex items-center gap-2 text-micro text-ink-muted">
                <span>0.4</span>
                <span className="h-1.5 w-24 rounded" style={{ background: "linear-gradient(90deg,#C08552,#D9A441,#A9C08D,#5E9678)" }} />
                <span>0.8</span>
              </div>
            </>
          ) : (
            <>
              <div className="mb-1 text-micro font-medium text-ink-soft">Irrigation priority</div>
              <div className="flex gap-3 text-micro text-ink-muted">
                {[1, 2, 3, 4].map((p) => (
                  <span key={p} className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm" style={{ background: priorityColor(p) }} />P{p}
                  </span>
                ))}
              </div>
            </>
          )}
          <div className="mt-1.5 flex items-center gap-3 border-t border-line pt-1.5 text-micro text-ink-muted">
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-info" /> Sensor</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm border border-[#8FA694]" /> Field boundary</span>
          </div>
        </div>
      ) : null}

      {/* Tooltip */}
      {hover ? (
        <div
          className="pointer-events-none absolute z-20 w-52 rounded-lg border border-line bg-white/95 p-3 text-tiny shadow-pop backdrop-blur"
          style={{
            left: Math.min(hover.x + 12, (containerRef.current?.clientWidth ?? 400) - 220),
            top: hover.y + 12,
          }}
        >
          <div className="mb-1.5 text-[13px] font-semibold text-ink">{hover.z.name}</div>
          {[
            ["Moisture", `${hover.z.moisturePct.toFixed(1)}%`],
            ["Stress risk", `${hover.z.stressRiskPct}%`],
            ["Water need", `${hover.z.waterRequirementL} L`],
            ["Layer value", LAYER_VALUE[layer]?.(hover.z) ?? "—"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-0.5">
              <span className="text-ink-muted">{k}</span>
              <span className="font-medium text-ink">{v}</span>
            </div>
          ))}
        </div>
      ) : null}

      {/* Sensor tooltip */}
      {sensorHover ? (
        <div
          className="pointer-events-none absolute z-20 rounded-lg border border-line bg-white/95 px-3 py-2 text-tiny shadow-pop backdrop-blur"
          style={{
            left: Math.min(sensorHover.x + 12, (containerRef.current?.clientWidth ?? 400) - 160),
            top: sensorHover.y + 12,
          }}
        >
          <div className="font-medium capitalize text-ink">{sensorHover.kind.replace(/_/g, " ")}</div>
          <div className="text-ink-muted">
            Reading <span className="font-semibold text-ink">{sensorHover.value.toFixed(1)}</span>
            {sensorHover.kind.includes("moisture") ? "%" : sensorHover.kind.includes("temp") ? "°C" : ""} · telemetry
          </div>
        </div>
      ) : null}

      {!ready ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-subtle text-tiny text-ink-muted">
          Loading field map…
        </div>
      ) : null}
    </div>
  );
}
