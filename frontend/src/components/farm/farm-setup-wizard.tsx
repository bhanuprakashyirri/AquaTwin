"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sprout,
  MapPin,
  Ruler,
  Wheat,
  Layers,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { useFarm, FarmInput } from "@/context/farm-context";

const COMMON_COUNTRIES = [
  "India",
  "United States",
  "Australia",
  "Brazil",
  "Canada",
  "Spain",
  "Kenya",
  "Egypt",
  "Vietnam",
  "Other",
];

const COMMON_CROPS = [
  "Rice",
  "Wheat",
  "Maize / Corn",
  "Cotton",
  "Sugarcane",
  "Soybean",
  "Tomato",
  "Potato",
  "Groundnut / Peanut",
  "Sorghum",
  "Millet",
  "Custom Crop",
];

const GROWTH_STAGES = [
  "Not specified",
  "Early vegetative / Germination",
  "Vegetative development",
  "Flowering / Reproductive",
  "Grain fill / Yield formation",
  "Ripening / Maturation",
  "Post-harvest",
];

interface Props {
  isOpen: boolean;
  onClose?: () => void;
  canClose?: boolean;
}

export function FarmSetupWizard({ isOpen, onClose, canClose = false }: Props) {
  const { saveFarm } = useFarm();
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [country, setCountry] = useState("India");
  const [stateRegion, setStateRegion] = useState("");
  const [districtCity, setDistrictCity] = useState("");
  const [locationNote, setLocationNote] = useState("");

  const [totalArea, setTotalArea] = useState<string>("");
  const [preferredUnit, setPreferredUnit] = useState<"ha" | "acres">("acres");

  const [cropType, setCropType] = useState("Rice");
  const [customCrop, setCustomCrop] = useState("");
  const [cropVariety, setCropVariety] = useState("");
  const [plantingDate, setPlantingDate] = useState("");
  const [growthStage, setGrowthStage] = useState("Not specified");

  const [fieldName, setFieldName] = useState("");
  const [fieldArea, setFieldArea] = useState<string>("");
  const [enableZoning, setEnableZoning] = useState(false);

  if (!isOpen) return null;

  const actualCrop = cropType === "Custom Crop" ? customCrop.trim() || "Custom Crop" : cropType;

  // Validation per step
  const validateStep1 = () => {
    if (!name.trim()) {
      setErrorMsg("Please enter a farm name.");
      return false;
    }
    if (!country.trim()) {
      setErrorMsg("Please select or enter a country.");
      return false;
    }
    if (!stateRegion.trim()) {
      setErrorMsg("Please provide your state or region.");
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const validateStep2 = () => {
    const num = parseFloat(totalArea);
    if (isNaN(num) || num <= 0) {
      setErrorMsg("Please enter a valid positive land area.");
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const validateStep3 = () => {
    if (cropType === "Custom Crop" && !customCrop.trim()) {
      setErrorMsg("Please specify the custom crop name.");
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const validateStep4 = () => {
    setErrorMsg(null);
    return true;
  };

  const handleNext = () => {
    setErrorMsg(null);
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    if (step === 4 && !validateStep4()) return;
    setStep((s) => Math.min(s + 1, 5));
  };

  const handleBack = () => {
    setErrorMsg(null);
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    const areaNum = parseFloat(totalArea) || 0;
    // Calculate area in hectares for standard agronomic calculations
    const areaInHa = preferredUnit === "acres" ? Number((areaNum * 0.404686).toFixed(2)) : areaNum;

    const fAreaNum = parseFloat(fieldArea) || areaNum;
    const fAreaInHa = preferredUnit === "acres" ? Number((fAreaNum * 0.404686).toFixed(2)) : fAreaNum;

    const payload: FarmInput = {
      name: name.trim(),
      country: country.trim(),
      stateRegion: stateRegion.trim(),
      districtCity: districtCity.trim() || undefined,
      location: locationNote.trim() || undefined,
      totalArea: areaInHa,
      preferredUnit,
      cropType: actualCrop,
      cropVariety: cropVariety.trim() || undefined,
      plantingDate: plantingDate || undefined,
      growthStage: growthStage !== "Not specified" ? growthStage : undefined,
      fieldName: fieldName.trim() || `${name.trim()} Plot 1`,
      fieldArea: fAreaInHa,
    };

    const res = await saveFarm(payload);
    setIsSubmitting(false);

    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        onClose?.();
      }, 1200);
    } else {
      setErrorMsg(res.error || "Failed to persist farm configuration.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Dark backdrop */}
      <div
        className="absolute inset-0 bg-[#0B1E19]/60 backdrop-blur-sm transition-opacity"
        onClick={canClose ? onClose : undefined}
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-[#C6DDD1] bg-surface shadow-pop text-ink"
      >
        {/* Header Bar */}
        <div className="relative border-b border-line bg-gradient-to-r from-[#F0F7F3] via-surface to-[#F0F7F3] px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand text-white shadow-sm">
                <Sprout size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-ink">Set Up Your Farm</h2>
                <p className="text-xs text-ink-muted">
                  Personalize your digital twin, water budget, and crop analytics.
                </p>
              </div>
            </div>
            {canClose && (
              <button
                onClick={onClose}
                className="rounded-full p-2 text-ink-muted hover:bg-subtle hover:text-ink transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Stepper pills */}
          <div className="mt-5 grid grid-cols-5 gap-1.5">
            {[
              { num: 1, label: "Farm" },
              { num: 2, label: "Land" },
              { num: 3, label: "Crop" },
              { num: 4, label: "Field" },
              { num: 5, label: "Review" },
            ].map((s) => (
              <div key={s.num} className="space-y-1">
                <div
                  className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                    step >= s.num ? "bg-brand" : "bg-[#E2EDE7]"
                  }`}
                />
                <span
                  className={`block text-center text-[10px] font-semibold transition-colors ${
                    step === s.num ? "text-brand" : step > s.num ? "text-ink" : "text-ink-faint"
                  }`}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-7 max-h-[70vh] overflow-y-auto">
          {errorMsg && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* STEP 1: Farm Details */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-sm font-bold text-ink">Step 1 — Farm Details</h3>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Enter the official identity and geographic region of your farm.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">
                    Farm Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Green Valley Farm, Sunrise Agro"
                    className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">
                      Country <span className="text-danger">*</span>
                    </label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                    >
                      {COMMON_COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">
                      State or Region <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      value={stateRegion}
                      onChange={(e) => setStateRegion(e.target.value)}
                      placeholder="e.g. Andhra Pradesh, Punjab, California"
                      className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">
                      District or City <span className="text-ink-faint font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={districtCity}
                      onChange={(e) => setDistrictCity(e.target.value)}
                      placeholder="e.g. West Godavari, Fresno"
                      className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">
                      Specific Location Note <span className="text-ink-faint font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={locationNote}
                      onChange={(e) => setLocationNote(e.target.value)}
                      placeholder="e.g. Near Canal Gate 4"
                      className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Land Details */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-sm font-bold text-ink">Step 2 — Land Details</h3>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Specify the total cultivated area and choose your preferred measurement unit.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">
                    Preferred Area Unit
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPreferredUnit("acres")}
                      className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-semibold transition-all cursor-pointer ${
                        preferredUnit === "acres"
                          ? "border-brand bg-brand-light text-brand-dark shadow-sm"
                          : "border-line bg-subtle text-ink-soft hover:bg-surface"
                      }`}
                    >
                      <Ruler size={15} />
                      Acres (ac)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreferredUnit("ha")}
                      className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-semibold transition-all cursor-pointer ${
                        preferredUnit === "ha"
                          ? "border-brand bg-brand-light text-brand-dark shadow-sm"
                          : "border-line bg-subtle text-ink-soft hover:bg-surface"
                      }`}
                    >
                      <Ruler size={15} />
                      Hectares (ha)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">
                    Total Cultivated Area ({preferredUnit}) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={totalArea}
                    onChange={(e) => setTotalArea(e.target.value)}
                    placeholder={preferredUnit === "acres" ? "e.g. 15.5" : "e.g. 6.2"}
                    className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                  />
                  <p className="mt-1.5 text-micro text-ink-muted">
                    {totalArea && !isNaN(parseFloat(totalArea)) && parseFloat(totalArea) > 0 ? (
                      <>
                        Equivalent to{" "}
                        <strong className="text-ink">
                          {preferredUnit === "acres"
                            ? `${(parseFloat(totalArea) * 0.404686).toFixed(2)} hectares`
                            : `${(parseFloat(totalArea) * 2.47105).toFixed(2)} acres`}
                        </strong>
                        . Retained in your display preference across the console.
                      </>
                    ) : (
                      "Enter your actual land area. No placeholder values are used."
                    )}
                  </p>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Crop Details */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-sm font-bold text-ink">Step 3 — Crop Configuration</h3>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Select your primary cultivated crop to calibrate evapotranspiration and irrigation models.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">
                    Primary Crop <span className="text-danger">*</span>
                  </label>
                  <select
                    value={cropType}
                    onChange={(e) => setCropType(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                  >
                    {COMMON_CROPS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {cropType === "Custom Crop" && (
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">
                      Enter Crop Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      value={customCrop}
                      onChange={(e) => setCustomCrop(e.target.value)}
                      placeholder="e.g. Mustard, Chickpea, Coffee"
                      className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">
                      Crop Variety <span className="text-ink-faint font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={cropVariety}
                      onChange={(e) => setCropVariety(e.target.value)}
                      placeholder="e.g. Swarna, Sonalika, Pioneer 3396"
                      className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">
                      Current Growth Stage <span className="text-ink-faint font-normal">(If known)</span>
                    </label>
                    <select
                      value={growthStage}
                      onChange={(e) => setGrowthStage(e.target.value)}
                      className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                    >
                      {GROWTH_STAGES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">
                    Planting / Sowing Date <span className="text-ink-faint font-normal">(Optional)</span>
                  </label>
                  <input
                    type="date"
                    value={plantingDate}
                    onChange={(e) => setPlantingDate(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface px-3.5 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                  />
                </div>
              </motion.div>
            )}

            {/* STEP 4: Field Setup */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-sm font-bold text-ink">Step 4 — Field Configuration</h3>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Define your initial cultivated plot. Geospatial boundaries can be updated anytime.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">
                    Field or Plot Name
                  </label>
                  <input
                    type="text"
                    value={fieldName}
                    onChange={(e) => setFieldName(e.target.value)}
                    placeholder={name ? `${name} Plot 1` : "Main Cultivated Plot"}
                    className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">
                    Field Area ({preferredUnit})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={fieldArea}
                    onChange={(e) => setFieldArea(e.target.value)}
                    placeholder={totalArea || "Same as total farm area"}
                    className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                  />
                </div>

                <div className="rounded-2xl border border-line bg-subtle p-4">
                  <div className="flex items-start gap-3">
                    <Layers size={18} className="text-brand shrink-0 mt-0.5" />
                    <div className="text-xs text-ink-soft leading-relaxed">
                      <strong className="text-ink font-semibold">Geospatial Mapping Notice:</strong>
                      <p className="mt-1 text-ink-muted">
                        Field polygon boundaries and subzone telemetry are marked as{" "}
                        <span className="font-medium text-ink">Configuration Pending</span> until you map
                        GPS coordinates or enroll hardware sensors in Settings. The system will honestly
                        report this state rather than inventing fictional telemetry.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 5: Review & Save */}
            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-sm font-bold text-ink">Step 5 — Review and Save</h3>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Verify your farm information before saving to your authenticated profile.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="rounded-2xl border border-line bg-subtle p-4">
                    <div className="flex items-center justify-between text-xs font-bold text-ink">
                      <span>Farm Details</span>
                      <button
                        onClick={() => setStep(1)}
                        className="text-micro font-semibold text-brand hover:underline cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="mt-2 space-y-1 text-xs">
                      <div>
                        <span className="text-ink-muted">Name:</span> <strong>{name}</strong>
                      </div>
                      <div>
                        <span className="text-ink-muted">Region:</span> {stateRegion}, {country}
                      </div>
                      {districtCity && (
                        <div>
                          <span className="text-ink-muted">District:</span> {districtCity}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-line bg-subtle p-4">
                    <div className="flex items-center justify-between text-xs font-bold text-ink">
                      <span>Land Area</span>
                      <button
                        onClick={() => setStep(2)}
                        className="text-micro font-semibold text-brand hover:underline cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="mt-2 space-y-1 text-xs">
                      <div>
                        <span className="text-ink-muted">Total:</span>{" "}
                        <strong>
                          {totalArea} {preferredUnit}
                        </strong>
                      </div>
                      <div className="text-micro text-ink-muted">
                        Metric:{" "}
                        {preferredUnit === "acres"
                          ? `${(parseFloat(totalArea || "0") * 0.404686).toFixed(2)} ha`
                          : `${(parseFloat(totalArea || "0") * 2.47105).toFixed(2)} acres`}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-line bg-subtle p-4">
                    <div className="flex items-center justify-between text-xs font-bold text-ink">
                      <span>Crop Configuration</span>
                      <button
                        onClick={() => setStep(3)}
                        className="text-micro font-semibold text-brand hover:underline cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="mt-2 space-y-1 text-xs">
                      <div>
                        <span className="text-ink-muted">Crop:</span> <strong>{actualCrop}</strong>
                      </div>
                      {cropVariety && (
                        <div>
                          <span className="text-ink-muted">Variety:</span> {cropVariety}
                        </div>
                      )}
                      <div>
                        <span className="text-ink-muted">Stage:</span> {growthStage}
                      </div>
                      {plantingDate && (
                        <div>
                          <span className="text-ink-muted">Sown:</span> {plantingDate}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-line bg-subtle p-4">
                    <div className="flex items-center justify-between text-xs font-bold text-ink">
                      <span>Plot Configuration</span>
                      <button
                        onClick={() => setStep(4)}
                        className="text-micro font-semibold text-brand hover:underline cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="mt-2 space-y-1 text-xs">
                      <div>
                        <span className="text-ink-muted">Field:</span>{" "}
                        <strong>{fieldName.trim() || `${name} Plot 1`}</strong>
                      </div>
                      <div>
                        <span className="text-ink-muted">Boundary:</span> Coordinate mapping pending
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-brand/20 bg-brand-light/50 p-3 text-xs text-brand-dark">
                  <ShieldCheck size={16} className="shrink-0" />
                  <span>
                    Data will be securely tied to your authenticated Supabase user session with Row Level Security.
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-line bg-subtle px-6 py-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={isSubmitting || success}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-subtle transition-colors cursor-pointer disabled:opacity-50"
            >
              <ArrowLeft size={14} /> Back
            </button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-dark transition-colors cursor-pointer"
            >
              Continue <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting || success}
              className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-dark transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving Farm…
                </>
              ) : success ? (
                <>
                  <CheckCircle2 size={15} /> Farm Saved!
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} /> Save Farm
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
