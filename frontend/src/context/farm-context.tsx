"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/context/auth-context";
import { tryFetch, callApi } from "@/services/api-client";
import type { Farm, Field, Crop, GeoPolygon } from "@/types";

export interface FarmInput {
  name: string;
  country: string;
  stateRegion: string;
  districtCity?: string;
  location?: string;
  totalArea: number;
  preferredUnit: "ha" | "acres";
  cropType: string;
  cropVariety?: string;
  plantingDate?: string;
  growthStage?: string;
  fieldName: string;
  fieldArea: number;
  boundary?: GeoPolygon;
}

interface FarmContextType {
  farms: Farm[];
  currentFarm: Farm | null;
  currentField: Field | null;
  loading: boolean;
  hasConfiguredFarm: boolean;
  setupModalOpen: boolean;
  openFarmSetup: () => void;
  closeFarmSetup: () => void;
  saveFarm: (input: FarmInput) => Promise<{ success: boolean; error?: string }>;
  updateFarm: (farmId: string, updates: Partial<FarmInput>) => Promise<{ success: boolean; error?: string }>;
  selectFarm: (farmId: string) => void;
  refreshFarms: () => Promise<void>;
}

const FarmContext = createContext<FarmContextType | undefined>(undefined);

export function FarmProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [currentFarm, setCurrentFarm] = useState<Farm | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupModalOpen, setSetupModalOpen] = useState(false);

  const currentField: Field | null = currentFarm?.fields?.[0] ?? null;
  const hasConfiguredFarm = Boolean(currentFarm && currentFarm.name && currentFarm.name.trim().length > 0);

  const openFarmSetup = useCallback(() => setSetupModalOpen(true), []);
  const closeFarmSetup = useCallback(() => setSetupModalOpen(false), []);

  const selectFarm = useCallback((farmId: string) => {
    setFarms((prev) => {
      const found = prev.find((f) => f.id === farmId);
      if (found) setCurrentFarm(found);
      return prev;
    });
  }, []);

  const loadFarms = useCallback(async () => {
    if (!user) {
      setFarms([]);
      setCurrentFarm(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    let resolvedFarms: Farm[] = [];

    // 1. Check Supabase Auth user_metadata
    const metaFarm = user.user_metadata?.current_farm as Farm | undefined;
    const metaFarms = (user.user_metadata?.farms as Farm[] | undefined) || (metaFarm ? [metaFarm] : []);

    if (metaFarms.length > 0) {
      resolvedFarms = metaFarms;
    }

    // 2. Query Supabase relational tables if available
    if (isSupabaseConfigured) {
      try {
        const { data: dbFarms, error } = await supabase
          .from("farms")
          .select("*, fields(*)")
          .eq("user_id", user.id);

        if (!error && dbFarms && dbFarms.length > 0) {
          const mapped: Farm[] = dbFarms.map((f: any) => ({
            id: f.id,
            userId: f.user_id,
            name: f.name,
            country: f.country || "",
            stateRegion: f.state_region || "",
            districtCity: f.district_city || "",
            location: f.location || "",
            totalArea: Number(f.total_area) || 0,
            preferredUnit: f.preferred_unit || "ha",
            fields: (f.fields || []).map((fd: any) => ({
              id: fd.id,
              name: fd.name,
              areaHa: Number(fd.area) || 0,
              crop: {
                name: fd.crop_name || "Crop not configured",
                variety: fd.crop_variety || "",
                growthStage: fd.crop_stage || "",
                daysAfterSowing: 0,
                cropCoefficient: 1.0,
              },
              geometry: fd.boundary_geojson || { type: "Polygon", coordinates: [] },
              sowingDate: fd.sowing_date || "",
              soilTexture: "Loam",
            })),
          }));
          resolvedFarms = mapped;
        }
      } catch {
        // Fallback gracefully to user_metadata or backend API
      }
    }

    // 3. Query backend API with user attribution
    try {
      const beData = await tryFetch<{ farms: Farm[] }>(`/api/farms?user_id=${user.id}`);
      if (beData?.farms && beData.farms.length > 0) {
        // Merge or adopt backend records if user has none yet
        if (resolvedFarms.length === 0) {
          resolvedFarms = beData.farms;
        }
      }
    } catch {
      // Backend optional
    }

    setFarms(resolvedFarms);
    setCurrentFarm(resolvedFarms[0] || null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      loadFarms();
    }
  }, [authLoading, loadFarms]);

  const saveFarm = async (input: FarmInput): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: "Must be signed in to configure a farm." };
    }

    try {
      const farmId = `farm-${Date.now()}`;
      const fieldId = `field-${Date.now()}`;

      const computedLocation = (
        input.location ||
        [input.districtCity, input.stateRegion, input.country].filter(Boolean).join(", ")
      ).trim() || "Location not set";

      const newFarm: Farm = {
        id: farmId,
        userId: user.id,
        name: input.name.trim(),
        country: input.country.trim(),
        stateRegion: input.stateRegion.trim(),
        districtCity: (input.districtCity || "").trim(),
        location: computedLocation,
        totalArea: Number(input.totalArea) || 0,
        preferredUnit: input.preferredUnit,
        fields: [
          {
            id: fieldId,
            name: input.fieldName.trim() || `${input.name.trim()} Plot 1`,
            areaHa: Number(input.fieldArea) || Number(input.totalArea) || 0,
            crop: {
              name: input.cropType.trim() || "Crop not configured",
              variety: (input.cropVariety || "").trim(),
              growthStage: (input.growthStage || "").trim(),
              daysAfterSowing: 0,
              cropCoefficient: 1.0,
            },
            geometry: input.boundary || { type: "Polygon", coordinates: [] },
            sowingDate: input.plantingDate || "",
            soilTexture: "Loam",
          },
        ],
      };

      // 1. Persist to Supabase Auth metadata (always available & authorized)
      const updatedFarms = [...farms.filter((f) => f.id !== newFarm.id), newFarm];
      if (isSupabaseConfigured) {
        await supabase.auth.updateUser({
          data: {
            current_farm: newFarm,
            farms: updatedFarms,
          },
        });

        // 2. Attempt insert into Supabase relational tables if present
        try {
          await supabase.from("farms").upsert({
            id: farmId,
            user_id: user.id,
            name: newFarm.name,
            country: newFarm.country,
            state_region: newFarm.stateRegion,
            district_city: newFarm.districtCity,
            location: newFarm.location,
            total_area: newFarm.totalArea,
            preferred_unit: newFarm.preferredUnit,
            updated_at: new Date().toISOString(),
          });

          await supabase.from("fields").upsert({
            id: fieldId,
            farm_id: farmId,
            user_id: user.id,
            name: newFarm.fields[0].name,
            area: newFarm.fields[0].areaHa,
            boundary_geojson: newFarm.fields[0].geometry,
            updated_at: new Date().toISOString(),
          });
        } catch {
          // Relational tables may not be created yet in user's Supabase dashboard
        }
      }

      // 3. Sync to backend API
      try {
        await callApi("/api/farms", {
          method: "POST",
          body: JSON.stringify({
            ...input,
            id: farmId,
            fieldId,
            userId: user.id,
            user_id: user.id,
          }),
        });
      } catch {
        // Backend sync non-blocking
      }

      setFarms(updatedFarms);
      setCurrentFarm(newFarm);
      setSetupModalOpen(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to persist farm configuration." };
    }
  };

  const updateFarm = async (
    farmId: string,
    updates: Partial<FarmInput>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "Must be signed in to update farm." };

    try {
      const existing = farms.find((f) => f.id === farmId) || currentFarm;
      if (!existing) return { success: false, error: "Farm not found." };

      const computedLocation = (
        updates.location ||
        (updates.districtCity || updates.stateRegion || updates.country
          ? [
              updates.districtCity ?? existing.districtCity,
              updates.stateRegion ?? existing.stateRegion,
              updates.country ?? existing.country,
            ]
              .filter(Boolean)
              .join(", ")
          : existing.location)
      ).trim();

      const updatedFarm: Farm = {
        ...existing,
        name: updates.name ? updates.name.trim() : existing.name,
        country: updates.country !== undefined ? updates.country.trim() : existing.country,
        stateRegion: updates.stateRegion !== undefined ? updates.stateRegion.trim() : existing.stateRegion,
        districtCity: updates.districtCity !== undefined ? updates.districtCity.trim() : existing.districtCity,
        location: computedLocation,
        totalArea: updates.totalArea !== undefined ? Number(updates.totalArea) : existing.totalArea,
        preferredUnit: updates.preferredUnit ?? existing.preferredUnit,
        fields: existing.fields.map((f, i) => {
          if (i === 0) {
            return {
              ...f,
              name: updates.fieldName ? updates.fieldName.trim() : f.name,
              areaHa: updates.fieldArea !== undefined ? Number(updates.fieldArea) : f.areaHa,
              crop: {
                ...f.crop,
                name: updates.cropType ? updates.cropType.trim() : f.crop.name,
                variety: updates.cropVariety !== undefined ? updates.cropVariety.trim() : f.crop.variety,
                growthStage: updates.growthStage !== undefined ? updates.growthStage.trim() : f.crop.growthStage,
              },
            };
          }
          return f;
        }),
      };

      const updatedFarms = farms.map((f) => (f.id === farmId ? updatedFarm : f));

      // 1. Persist to Supabase Auth metadata
      if (isSupabaseConfigured) {
        await supabase.auth.updateUser({
          data: {
            current_farm: updatedFarm,
            farms: updatedFarms,
          },
        });

        // 2. Attempt DB update
        try {
          await supabase
            .from("farms")
            .update({
              name: updatedFarm.name,
              country: updatedFarm.country,
              state_region: updatedFarm.stateRegion,
              district_city: updatedFarm.districtCity,
              location: updatedFarm.location,
              total_area: updatedFarm.totalArea,
              preferred_unit: updatedFarm.preferredUnit,
              updated_at: new Date().toISOString(),
            })
            .eq("id", farmId)
            .eq("user_id", user.id);
        } catch {
          // Table update fallback
        }
      }

      // 3. Sync to backend API
      try {
        await callApi(`/api/farms/${farmId}`, {
          method: "PUT",
          body: JSON.stringify({
            ...updates,
            userId: user.id,
            user_id: user.id,
          }),
        });
      } catch {
        // non-blocking
      }

      setFarms(updatedFarms);
      if (currentFarm?.id === farmId) {
        setCurrentFarm(updatedFarm);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to update farm details." };
    }
  };

  return (
    <FarmContext.Provider
      value={{
        farms,
        currentFarm,
        currentField,
        loading,
        hasConfiguredFarm,
        setupModalOpen,
        openFarmSetup,
        closeFarmSetup,
        saveFarm,
        updateFarm,
        selectFarm,
        refreshFarms: loadFarms,
      }}
    >
      {children}
    </FarmContext.Provider>
  );
}

export function useFarm() {
  const context = useContext(FarmContext);
  if (!context) {
    throw new Error("useFarm must be used within a FarmProvider");
  }
  return context;
}
