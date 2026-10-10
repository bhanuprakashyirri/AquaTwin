"use client";

import { useState, useEffect } from "react";
import { Database, Satellite, Server, Wifi, Cpu, ShieldCheck, UserCheck, Save, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Panel, PanelHeader, DataBadge } from "@/components/ui/panel";
import { fetchHealth, fetchSafetyPolicy, fetchSystemStatus } from "@/services/api";
import { useApiData } from "@/hooks/useApiData";
import { useAuth } from "@/context/auth-context";
import { useFarm } from "@/context/farm-context";
import { getGeminiApiKey, setGeminiApiKey } from "@/agent/engine";

const INTEGRATIONS = [
  {
    icon: Server,
    name: "Weather Intelligence",
    provider: "Open-Meteo High-Resolution NWP",
    status: "Connected",
    tone: "good" as const,
    note: "Live 48-hour hourly forecasting and 7-day meteorological observations driving FAO-56 reference evapotranspiration.",
  },
  {
    icon: Database,
    name: "Relational Persistence",
    provider: "SQLite Database",
    status: "Active",
    tone: "good" as const,
    note: "ACID-compliant storage for farms, field boundaries, soil sensor telemetry, and historical irrigation logs.",
  },
  {
    icon: Cpu,
    name: "Optimization Solver",
    provider: "Google OR-Tools CP-SAT",
    status: "Active",
    tone: "good" as const,
    note: "Constrained mathematical programming solver optimizing water allocation across prioritized farm subzones.",
  },
  {
    icon: Wifi,
    name: "IoT Sensor Gateway",
    provider: "Telemetry WebSocket Gateway",
    status: "Active",
    tone: "neutral" as const,
    note: "Real-time ground soil moisture and temperature ingestion gateway for enrolled hardware probes.",
  },
  {
    icon: Satellite,
    name: "Multispectral Satellite",
    provider: "Copernicus Sentinel-2 MSI",
    status: "Optional (Unconfigured)",
    tone: "neutral" as const,
    note: "Configure SENTINEL_API_KEY in backend environment to ingest 10m-resolution NDVI and NDWI rasters.",
  },
];

export default function SettingsPage() {
  const statusQ = useApiData(() => fetchSystemStatus("field-a"));
  const { user } = useAuth();
  const { currentFarm, currentField, hasConfiguredFarm, saveFarm, updateFarm } = useFarm();

  const [formFarmName, setFormFarmName] = useState("");
  const [formCountry, setFormCountry] = useState("India");
  const [formStateRegion, setFormStateRegion] = useState("");
  const [formDistrictCity, setFormDistrictCity] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formTotalArea, setFormTotalArea] = useState("");
  const [formPreferredUnit, setFormPreferredUnit] = useState<"ha" | "acres">("ha");
  const [formCropType, setFormCropType] = useState("");
  const [formCropVariety, setFormCropVariety] = useState("");
  const [formGrowthStage, setFormGrowthStage] = useState("");
  const [formFieldName, setFormFieldName] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [geminiKey, setGeminiKey] = useState("");
  const [geminiSaved, setGeminiSaved] = useState(false);

  useEffect(() => {
    const k = getGeminiApiKey();
    if (k) setGeminiKey(k);
  }, []);

  const handleSaveGeminiKey = (e: React.FormEvent) => {
    e.preventDefault();
    setGeminiApiKey(geminiKey);
    setGeminiSaved(true);
    setTimeout(() => setGeminiSaved(false), 3000);
  };

  useEffect(() => {
    if (currentFarm) {
      setFormFarmName(currentFarm.name || "");
      setFormCountry(currentFarm.country || "India");
      setFormStateRegion(currentFarm.stateRegion || "");
      setFormDistrictCity(currentFarm.districtCity || "");
      setFormLocation(currentFarm.location || "");
      setFormTotalArea(currentFarm.totalArea ? String(currentFarm.totalArea) : "");
      setFormPreferredUnit(currentFarm.preferredUnit || "ha");
      setFormCropType(currentField?.crop?.name || "");
      setFormCropVariety(currentField?.crop?.variety || "");
      setFormGrowthStage(currentField?.crop?.growthStage || "");
      setFormFieldName(currentField?.name || "");
    }
  }, [currentFarm, currentField]);

  const handleSaveFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    const areaNum = parseFloat(formTotalArea) || 0;
    if (areaNum <= 0) {
      setSaveError("Please enter a valid positive land area.");
      setIsSaving(false);
      return;
    }

    const payload = {
      name: formFarmName.trim(),
      country: formCountry.trim(),
      stateRegion: formStateRegion.trim(),
      districtCity: formDistrictCity.trim() || undefined,
      location: formLocation.trim() || undefined,
      totalArea: areaNum,
      preferredUnit: formPreferredUnit,
      cropType: formCropType.trim() || "Crop not configured",
      cropVariety: formCropVariety.trim() || undefined,
      growthStage: formGrowthStage.trim() || undefined,
      fieldName: formFieldName.trim() || `${formFarmName.trim()} Plot 1`,
      fieldArea: areaNum,
    };

    let res;
    if (hasConfiguredFarm && currentFarm) {
      res = await updateFarm(currentFarm.id, payload);
    } else {
      res = await saveFarm(payload);
    }

    setIsSaving(false);
    if (res.success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } else {
      setSaveError(res.error || "Failed to update farm settings.");
    }
  };

  const fullName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "AquaTwin Operator";
  const healthQ = useApiData(() => fetchHealth());
  const policyQ = useApiData(() => fetchSafetyPolicy());

  const policy = policyQ.data?.policy ?? {};
  const crops = policyQ.data?.crops ?? {};
  const cropRows = Object.entries(crops);

  return (
    <div className="mx-auto max-w-[1040px] space-y-6">
      <PageHeader
        title="Settings & System Status"
        subtitle="Active integrations, telemetry connections, and field operational constraints."
        status={statusQ.data}
      />

      {/* Operator Identity */}
      <Panel>
        <PanelHeader
          title="Operator account & identity"
          subtitle="Authenticated session and credentials"
          right={<DataBadge tone="good"><UserCheck size={12} className="inline mr-1" />Authenticated</DataBadge>}
        />
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-subtle p-3.5">
            <div className="text-micro font-bold uppercase tracking-wider text-ink-muted">Operator Name</div>
            <div className="mt-1 text-base font-bold text-ink">{fullName}</div>
            <div className="mt-0.5 text-micro text-ink-faint">Role: Field Administrator</div>
          </div>
          <div className="rounded-xl border border-line bg-subtle p-3.5">
            <div className="text-micro font-bold uppercase tracking-wider text-ink-muted">Account Email</div>
            <div className="mt-1 text-base font-bold text-ink truncate">{user?.email || "operator@aquatwin.internal"}</div>
            <div className="mt-0.5 text-micro text-ink-faint">Provider: Supabase Auth</div>
          </div>
          <div className="rounded-xl border border-line bg-subtle p-3.5">
            <div className="text-micro font-bold uppercase tracking-wider text-ink-muted">Session Identifier</div>
            <div className="mt-1 font-mono text-xs font-semibold text-ink-soft truncate">{user?.id || "Active local session"}</div>
            <div className="mt-0.5 text-micro text-ink-faint">Auto-refresh enabled</div>
          </div>
        </div>
      </Panel>

      {/* Farm & Crop Configuration Editor */}
      <Panel>
        <PanelHeader
          title="Farm Profile & Field Parameters"
          subtitle="Configure physical property boundaries, land area, and crop calibration"
          right={
            <DataBadge tone={hasConfiguredFarm ? "good" : "warn"}>
              {hasConfiguredFarm ? "Saved in Supabase" : "Setup Required"}
            </DataBadge>
          }
        />
        <div className="p-5">
          {saveSuccess && (
            <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-success/30 bg-success/10 p-3 text-xs text-success-dark font-medium">
              <CheckCircle2 size={16} className="text-success shrink-0" />
              <span>Farm profile updated successfully and persisted to Supabase session.</span>
            </div>
          )}

          {saveError && (
            <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger font-medium">
              <AlertCircle size={16} className="shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          <form onSubmit={handleSaveFarm} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Farm Name</label>
                <input
                  type="text"
                  value={formFarmName}
                  onChange={(e) => setFormFarmName(e.target.value)}
                  placeholder="e.g. Green Valley Farm"
                  required
                  className="w-full rounded-xl border border-line bg-surface px-3.5 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Country</label>
                <input
                  type="text"
                  value={formCountry}
                  onChange={(e) => setFormCountry(e.target.value)}
                  placeholder="e.g. India, United States"
                  required
                  className="w-full rounded-xl border border-line bg-surface px-3.5 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">State or Region</label>
                <input
                  type="text"
                  value={formStateRegion}
                  onChange={(e) => setFormStateRegion(e.target.value)}
                  placeholder="e.g. Andhra Pradesh, California"
                  required
                  className="w-full rounded-xl border border-line bg-surface px-3.5 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">District or City</label>
                <input
                  type="text"
                  value={formDistrictCity}
                  onChange={(e) => setFormDistrictCity(e.target.value)}
                  placeholder="e.g. West Godavari"
                  className="w-full rounded-xl border border-line bg-surface px-3.5 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Total Land Area</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={formTotalArea}
                  onChange={(e) => setFormTotalArea(e.target.value)}
                  placeholder="e.g. 10.0"
                  required
                  className="w-full rounded-xl border border-line bg-surface px-3.5 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Area Display Unit</label>
                <select
                  value={formPreferredUnit}
                  onChange={(e) => setFormPreferredUnit(e.target.value as "ha" | "acres")}
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                >
                  <option value="ha">Hectares (ha)</option>
                  <option value="acres">Acres (ac)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Enrolled Crop</label>
                <input
                  type="text"
                  value={formCropType}
                  onChange={(e) => setFormCropType(e.target.value)}
                  placeholder="e.g. Rice, Wheat, Cotton"
                  required
                  className="w-full rounded-xl border border-line bg-surface px-3.5 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Crop Variety</label>
                <input
                  type="text"
                  value={formCropVariety}
                  onChange={(e) => setFormCropVariety(e.target.value)}
                  placeholder="e.g. MTU-7029 (Swarna)"
                  className="w-full rounded-xl border border-line bg-surface px-3.5 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Current Growth Stage</label>
                <input
                  type="text"
                  value={formGrowthStage}
                  onChange={(e) => setFormGrowthStage(e.target.value)}
                  placeholder="e.g. Reproductive, Vegetative"
                  className="w-full rounded-xl border border-line bg-surface px-3.5 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Field / Plot Name</label>
                <input
                  type="text"
                  value={formFieldName}
                  onChange={(e) => setFormFieldName(e.target.value)}
                  placeholder="e.g. Plot 1"
                  className="w-full rounded-xl border border-line bg-surface px-3.5 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-ink mb-1.5">Location Note / Landmark</label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="e.g. Near Irrigation Canal 2"
                  className="w-full rounded-xl border border-line bg-surface px-3.5 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-line/60">
              <span className="text-micro text-ink-muted">
                Changes persist immediately to your Supabase cloud session and sync to local models.
              </span>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-dark transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Saving Changes…
                  </>
                ) : (
                  <>
                    <Save size={14} /> Save Farm Settings
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </Panel>

      {/* Google Gemini AI Voice & Reasoning */}
      <Panel>
        <PanelHeader
          title="Google Gemini AI Voice & Field Agent"
          subtitle="Configure your Gemini API key to power conversational reasoning and aloud voice synthesis"
          right={
            <DataBadge tone={geminiKey ? "good" : "neutral"}>
              {geminiKey ? "Connected" : "Unset / Fallback"}
            </DataBadge>
          }
        />
        <div className="p-5">
          <form onSubmit={handleSaveGeminiKey} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="max-w-xl">
                <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Sparkles size={16} className="text-brand" />
                  Gemini Flash 2.5 API Key
                </div>
                <p className="mt-1 text-xs text-ink-muted leading-relaxed">
                  Allows Aqua to inspect live soil telemetry, forecast rain windows, calculate irrigation requirements, and speak responses aloud with natural voice synthesis.
                </p>
              </div>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-brand hover:underline shrink-0"
              >
                Get Free Gemini Key →
              </a>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 rounded-xl border border-line bg-surface px-3.5 py-2 text-sm text-ink font-mono placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brand px-6 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-dark transition-colors cursor-pointer"
              >
                {geminiSaved ? (
                  <>
                    <CheckCircle2 size={14} /> Key Saved!
                  </>
                ) : (
                  "Save Gemini Key"
                )}
              </button>
            </div>
            <p className="text-micro text-ink-muted">
              Picks up automatically from <code className="rounded bg-subtle px-1 text-ink">NEXT_PUBLIC_GEMINI_API_KEY</code>, backend <code className="rounded bg-subtle px-1 text-ink">GEMINI_API_KEY</code>, or this browser input.
            </p>
          </form>
        </div>
      </Panel>

      {/* Irrigation & Safety Constraints */}
      <Panel>
        <PanelHeader
          title="Operational constraints & safety rules"
          subtitle="Hydraulic thresholds governing AI recommendation engines"
          right={<DataBadge tone="good"><ShieldCheck size={12} className="inline mr-1" />Active constraints</DataBadge>}
        />
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-subtle p-4">
            <div className="text-micro font-bold uppercase tracking-wider text-ink-muted">Moisture Target Range</div>
            <div className="mt-1 text-xl font-bold text-brand-dark">24.0% – 34.0%</div>
            <p className="mt-1 text-micro text-ink-muted leading-relaxed">
              Maintains root zone above stress threshold without deep percolation wastage.
            </p>
          </div>
          <div className="rounded-xl border border-line bg-subtle p-4">
            <div className="text-micro font-bold uppercase tracking-wider text-ink-muted">Crop Stress Ceiling</div>
            <div className="mt-1 text-xl font-bold text-warning">15.0% Risk</div>
            <p className="mt-1 text-micro text-ink-muted leading-relaxed">
              Any scenario exceeding 15% stress probability triggers immediate prioritization.
            </p>
          </div>
          <div className="rounded-xl border border-line bg-subtle p-4">
            <div className="text-micro font-bold uppercase tracking-wider text-ink-muted">48h Rain Deferral Window</div>
            <div className="mt-1 text-xl font-bold text-info">&gt; 50% Probability</div>
            <p className="mt-1 text-micro text-ink-muted leading-relaxed">
              Irrigation is deferred when forecast rainfall satisfies required root-zone volume.
            </p>
          </div>
        </div>
      </Panel>

      {/* Production Integrations Architecture */}
      <Panel>
        <PanelHeader
          title="Analytical architecture & data providers"
          subtitle="Real-time ingestion pipelines and optimization microservices"
          right={<DataBadge tone="good">Verified</DataBadge>}
        />
        <div className="space-y-3 p-5">
          {INTEGRATIONS.map((a) => (
            <div key={a.name} className="flex gap-3.5 rounded-xl border border-line bg-subtle p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface">
                <a.icon size={16} className="text-brand" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink">{a.name}</span>
                    <span className="text-tiny font-medium text-ink-muted">· {a.provider}</span>
                  </div>
                  <DataBadge tone={a.tone}>{a.status}</DataBadge>
                </div>
                <p className="mt-1 text-tiny leading-relaxed text-ink-muted">{a.note}</p>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Environment configuration */}
      <Panel className="mb-8">
        <PanelHeader title="Environment configuration" subtitle="Service gateway parameters" />
        <div className="space-y-2.5 p-5 text-tiny text-ink-muted">
          <div className="flex flex-wrap items-center justify-between border-b border-line/70 pb-2">
            <span>API Gateway Base:</span>
            <code className="rounded bg-white px-2 py-0.5 font-mono text-ink text-micro border border-line">
              {process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"}
            </code>
          </div>
          <div className="flex flex-wrap items-center justify-between border-b border-line/70 pb-2">
            <span>Backend health:</span>
            {healthQ.data ? (
              <DataBadge tone={healthQ.data.status === "ok" ? "good" : "warn"}>
                {healthQ.data.status} · {healthQ.data.environment}
              </DataBadge>
            ) : (
              <DataBadge tone="warn">unreachable</DataBadge>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between border-b border-line/70 pb-2">
            <span>Physical Modeling Standard:</span>
            <span className="font-medium text-ink">FAO-56 Irrigation & Drainage Paper No. 56</span>
          </div>
          <div className="flex flex-wrap items-center justify-between">
            <span>Constrained Optimization Protocol:</span>
            <span className="font-medium text-ink">Google OR-Tools CP-SAT Constraint Programming</span>
          </div>
        </div>
      </Panel>

      <Panel className="mb-8">
        <PanelHeader
          title="Missed-rain safety policy"
          subtitle="Calibrated thresholds for the electricity-slot protection engine"
          right={policyQ.data ? <DataBadge tone="good">active</DataBadge> : null}
        />
        <div className="p-5">
          {policyQ.data ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  ["Max acceptable stress", `${Math.round((policy.max_acceptable_stress as number) * 100)}%`],
                  ["Max depletion fraction", `${Math.round((policy.max_depletion_fraction as number) * 100)}%`],
                  ["Max saturation fraction", `${Math.round((policy.max_saturation_fraction as number) * 100)}%`],
                  ["Max data age", `${policy.max_data_age_hours} h`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-line bg-subtle p-3">
                    <div className="text-micro font-bold uppercase tracking-wider text-ink-muted">{k}</div>
                    <div className="mt-1 text-sm font-bold text-ink">{v}</div>
                  </div>
                ))}
              </div>
              {cropRows.length ? (
                <div>
                  <div className="mb-2 text-tiny font-semibold text-ink">Crop MAD thresholds (maximum allowable depletion)</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-tiny">
                      <thead className="border-b border-line bg-subtle text-micro font-bold uppercase tracking-wider text-ink-muted">
                        <tr>
                          <th className="px-4 py-2">Crop</th>
                          <th className="px-4 py-2 text-right">MAD (p)</th>
                          <th className="px-4 py-2 text-right">Stage sensitivity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {cropRows.map(([crop, profile]) => (
                          <tr key={crop} className="transition-colors hover:bg-subtle/70">
                            <td className="px-4 py-2.5 font-semibold text-ink">{crop}</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-brand-dark">{profile.mad.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right text-ink-muted">
                              {profile.stage_sensitivity.map((s) => s.toFixed(1)).join(" · ")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
              <p className="border-t border-line pt-3 text-micro leading-relaxed text-ink-faint">
                Thresholds are calibrated per crop from the field-day and train/val datasets (see dataset/dataset_meta.json) and can be tuned per request via policy_overrides.
              </p>
            </div>
          ) : (
            <div className="flex h-[100px] items-center justify-center text-tiny text-ink-muted">
              Safety policy unavailable — is the backend running?
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
