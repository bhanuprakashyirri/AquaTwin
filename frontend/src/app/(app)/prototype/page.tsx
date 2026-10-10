"use client";

import { useEffect, useState, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { CloudRain, Droplets, Leaf, Activity, MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// API Response type
type PrototypeData = {
  location: { lat: number; lng: number };
  weather: {
    tempNowC: number;
    rainProbability12h: number;
    rainExpected24hMm: number;
    source: string;
  };
  waterResource: {
    soilMoisturePct: number;
    waterBudgetRemainingL: number;
    soilType: string;
  };
  cropML: {
    irrigation_needed: boolean;
    recommended_amount_mm: number;
    note?: string;
  };
};

export default function PrototypePage() {
  const [data, setData] = useState<PrototypeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);

  // Selected Location (Locked)
  const lat = 16.5449;
  const lon = 81.5212;

  useEffect(() => {
    // 1. Fetch Data
    const fetchData = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/v1/prototype-data?lat=${lat}&lon=${lon}`);
        if (!res.ok) throw new Error(`Backend returned ${res.status}`);
        const json = await res.json();
        if (
          json &&
          typeof json.weather?.tempNowC === "number" &&
          json.cropML &&
          json.waterResource
        ) {
          setData(json);
        } else {
          setError("Unexpected response shape from backend.");
        }
      } catch (e) {
        console.error("Failed to fetch prototype data:", e);
        setError("Failed to reach the backend. Is the API server running on :8000?");
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // 2. Initialize Map
    if (mapContainerRef.current && !mapInstance.current) {
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
        center: [lon, lat],
        zoom: 15,
        interactive: false, // Locked
        attributionControl: false,
      });

      // Add a cool animated marker
      const markerElement = document.createElement("div");
      markerElement.className = "relative flex h-6 w-6";
      markerElement.innerHTML = `
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
        <span class="relative inline-flex rounded-full h-6 w-6 bg-brand border-2 border-white shadow-lg"></span>
      `;

      new maplibregl.Marker({ element: markerElement })
        .setLngLat([lon, lat])
        .addTo(map);

      mapInstance.current = map;
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  return (
    <div className="flex h-full bg-[#FAFAF9] p-6 gap-6 font-sans">
      
      {/* LEFT: Map Panel (Locked) */}
      <div className="w-1/3 flex flex-col gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-[#EBF0ED] p-5 flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-brand/10 rounded-lg">
              <MapPin className="text-brand w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Locked Site</h2>
              <p className="text-[12px] text-ink-muted">Coordinates: {lat}, {lon}</p>
            </div>
          </div>
          
          <div className="flex-1 rounded-xl overflow-hidden border border-[#EBF0ED] shadow-inner relative">
            <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
            
            {/* Map Overlay glass effect */}
            <div className="absolute bottom-4 left-4 right-4 bg-white/80 backdrop-blur-md border border-white/40 p-3 rounded-xl shadow-lg">
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand mb-1">Status</p>
              <p className="text-[13px] font-medium text-ink flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Telemetry Locked
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Data Dashboard */}
      <div className="w-2/3 flex flex-col gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-[#EBF0ED] p-6">
          <h1 className="text-xl font-bold text-ink mb-1">Site Data Prototye</h1>
          <p className="text-[13px] text-ink-muted mb-6">Aggregated intelligence for the selected location.</p>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 text-brand animate-spin" />
            </div>
          ) : data ? (
            <div className="grid grid-cols-2 gap-4">
              
              {/* Weather Data */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-blue-500 text-white rounded-xl shadow-sm">
                    <CloudRain className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-blue-900">Live Weather</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] text-blue-700/80">Current Temp</span>
                    <span className="font-medium text-blue-900">{data.weather.tempNowC.toFixed(1)}°C</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] text-blue-700/80">Rain Probability</span>
                    <span className="font-medium text-blue-900">{data.weather.rainProbability12h}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] text-blue-700/80">Expected (24h)</span>
                    <span className="font-medium text-blue-900">{data.weather.rainExpected24hMm.toFixed(1)} mm</span>
                  </div>
                </div>
              </div>

              {/* Crop ML Data */}
              <div className={cn(
                "p-5 rounded-2xl border",
                data.cropML.irrigation_needed 
                  ? "bg-gradient-to-br from-amber-50 to-orange-50/50 border-amber-200/50"
                  : "bg-gradient-to-br from-emerald-50 to-teal-50/50 border-emerald-200/50"
              )}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn(
                    "p-2.5 text-white rounded-xl shadow-sm",
                    data.cropML.irrigation_needed ? "bg-amber-500" : "bg-emerald-500"
                  )}>
                    <Activity className="w-5 h-5" />
                  </div>
                  <h3 className={cn("font-semibold", data.cropML.irrigation_needed ? "text-amber-900" : "text-emerald-900")}>
                    ML Prediction
                  </h3>
                </div>
                
                <div className="flex flex-col gap-1 mb-4">
                  <span className={cn(
                    "text-[11px] font-bold uppercase tracking-wider",
                    data.cropML.irrigation_needed ? "text-amber-600" : "text-emerald-600"
                  )}>Action</span>
                  <span className={cn(
                    "text-2xl font-bold tracking-tight",
                    data.cropML.irrigation_needed ? "text-amber-900" : "text-emerald-900"
                  )}>
                    {data.cropML.irrigation_needed ? "IRRIGATE" : "WAIT"}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className={cn(
                    "text-[13px]",
                    data.cropML.irrigation_needed ? "text-amber-700/80" : "text-emerald-700/80"
                  )}>Recommended Amount</span>
                  <span className={cn(
                    "font-bold",
                    data.cropML.irrigation_needed ? "text-amber-900" : "text-emerald-900"
                  )}>
                    {data.cropML.recommended_amount_mm.toFixed(1)} mm
                  </span>
                </div>
              </div>

              {/* Water Resource */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-sky-50 to-cyan-50/50 border border-sky-100/50 col-span-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-sky-500 text-white rounded-xl shadow-sm">
                    <Droplets className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-sky-900">Water Resource & Soil</h3>
                </div>
                
                <div className="grid grid-cols-3 gap-6">
                  <div className="flex flex-col">
                    <span className="text-[13px] text-sky-700/80 mb-1">Soil Moisture</span>
                    <div className="flex items-end gap-1">
                      <span className="text-2xl font-bold text-sky-900">{data.waterResource.soilMoisturePct.toFixed(1)}</span>
                      <span className="text-[13px] font-medium text-sky-700 mb-1">%</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-[13px] text-sky-700/80 mb-1">Remaining Budget</span>
                    <div className="flex items-end gap-1">
                      <span className="text-2xl font-bold text-sky-900">{data.waterResource.waterBudgetRemainingL.toLocaleString()}</span>
                      <span className="text-[13px] font-medium text-sky-700 mb-1">Liters</span>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[13px] text-sky-700/80 mb-1">Soil Type</span>
                    <div className="flex items-end gap-1">
                      <span className="text-xl font-bold text-sky-900">{data.waterResource.soilType}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center text-ink-muted text-sm py-10">
              {error ?? "Error loading data."}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
