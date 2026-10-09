"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type Map as MlMap, type MapGeoJSONFeature } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { LAYERS } from "@/lib/constants";
import { moistureColor, ndviColor, priorityColor, stressColor, CHART } from "@/lib/format";
import { cn } from "@/lib/utils";
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

export function FarmMap({
  zones,
  layer,
  onLayerChange,
  selectedZoneId,
  onZoneSelect,
  sensors = [],
  className,
  showLegend = true,
}: FarmMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState<{ x: number; y: number; z: Zone } | null>(null);
  const [sensorHover, setSensorHover] = useState<{ x: number; y: number; kind: string; value: number } | null>(null);
  const zonesRef = useRef(zones);
  const onZoneSelectRef = useRef(onZoneSelect);
  const interactRef = useRef(false);
  const fitRef = useRef(false);
  zonesRef.current = zones;
  onZoneSelectRef.current = onZoneSelect;

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

  // init map — light GIS base, fit to field once zones arrive
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {},
        layers: [{ id: "bg", type: "background", paint: { "background-color": "#EDF2EC" } }],
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
      },
      center: [81.5212, 16.5449],
      zoom: 15,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => setReady(true));
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

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
  }, [ready]);

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
          "text-color": "#1D493D",
          "text-halo-color": "#FFFFFF",
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
  }, [ready, zoneFc, sensorFc]);

  return (
    <div className={cn("relative h-full w-full overflow-hidden rounded-xl2 border border-line bg-[#EDF2EC]", className)}>
      <div ref={containerRef} className="h-full w-full" />

      {/* Layer selector */}
      {onLayerChange ? (
        <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-0.5 rounded-lg border border-line bg-white/95 p-1 shadow-card backdrop-blur">
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
