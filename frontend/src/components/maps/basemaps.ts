import type { StyleSpecification } from "maplibre-gl";

/**
 * Basemap style definitions — ported from the Sih-HailStrom
 * WeatherMap reference (Esri high-res satellite, thermal infrared,
 * relief topo, OpenStreetMap), extended with AquaTwin's light GIS
 * base. Every style shares the demotiles glyphs endpoint so zone
 * label symbol layers render on all basemaps.
 */

const GLYPHS = "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf";

const ESRI_ATTRIBUTION =
  "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community";

const ESRI_IMAGERY =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const ESRI_LABELS =
  "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

const ESRI_TOPO =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}";

const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export type BasemapKey = "light" | "satellite" | "infrared" | "topo" | "osm";

export const BASEMAPS: Record<BasemapKey, StyleSpecification> = {
  light: {
    version: 8,
    glyphs: GLYPHS,
    sources: {},
    layers: [{ id: "bg", type: "background", paint: { "background-color": "#EDF2EC" } }],
  },
  satellite: {
    version: 8,
    glyphs: GLYPHS,
    sources: {
      "esri-satellite": {
        type: "raster",
        tiles: [ESRI_IMAGERY],
        tileSize: 256,
        attribution: ESRI_ATTRIBUTION,
      },
      "esri-labels": {
        type: "raster",
        tiles: [ESRI_LABELS],
        tileSize: 256,
      },
    },
    layers: [
      { id: "satellite-layer", type: "raster", source: "esri-satellite", minzoom: 0, maxzoom: 19 },
      { id: "labels-layer", type: "raster", source: "esri-labels", minzoom: 0, maxzoom: 19 },
    ],
  },
  infrared: {
    version: 8,
    glyphs: GLYPHS,
    sources: {
      "esri-satellite": {
        type: "raster",
        tiles: [ESRI_IMAGERY],
        tileSize: 256,
        attribution: ESRI_ATTRIBUTION,
      },
      "esri-labels": {
        type: "raster",
        tiles: [ESRI_LABELS],
        tileSize: 256,
      },
    },
    layers: [
      {
        id: "satellite-base",
        type: "raster",
        source: "esri-satellite",
        paint: {
          "raster-brightness-max": 0.4,
          "raster-contrast": 0.5,
          "raster-saturation": -0.7,
        },
      },
      { id: "labels-layer", type: "raster", source: "esri-labels" },
    ],
  },
  topo: {
    version: 8,
    glyphs: GLYPHS,
    sources: {
      "esri-topo": {
        type: "raster",
        tiles: [ESRI_TOPO],
        tileSize: 256,
        attribution: ESRI_ATTRIBUTION,
      },
    },
    layers: [{ id: "topo-layer", type: "raster", source: "esri-topo", minzoom: 0, maxzoom: 19 }],
  },
  osm: {
    version: 8,
    glyphs: GLYPHS,
    sources: {
      "osm-tiles": {
        type: "raster",
        tiles: [OSM_TILES],
        tileSize: 256,
        attribution: "&copy; OpenStreetMap contributors",
      },
    },
    layers: [{ id: "osm-layer", type: "raster", source: "osm-tiles" }],
  },
};

export const BASEMAP_META: Record<
  BasemapKey,
  { label: string; short: string; chip: string }
> = {
  light: { label: "Light GIS", short: "Light", chip: "LIGHT GIS BASE" },
  satellite: { label: "Satellite", short: "Satellite", chip: "HIGH-RES SATELLITE" },
  infrared: { label: "Thermal Infrared", short: "Thermal", chip: "THERMAL INFRARED" },
  topo: { label: "Relief Topo", short: "Topo", chip: "RELIEF TOPO" },
  osm: { label: "Standard OSM", short: "OSM", chip: "OPENSTREETMAP" },
};
