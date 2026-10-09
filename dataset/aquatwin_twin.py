"""
AquaTwin core digital-twin module (PROTOTYPE parameters, not agronomic advice).

Contains:
  - crop / soil / irrigation-method parameter tables
  - simplified daily root-zone water balance (used by the data generator AND by What-If)
  - simulate_scenario(): What-If irrigation plans
  - explain(): human-readable reason codes for a recommendation
"""
import numpy as np

SEED = 42
STAGES = ["INITIAL", "DEVELOPMENT", "MID_SEASON", "LATE_SEASON"]

# dur = nominal days; frac = stage fractions; kc = stage Kc; root = max rooting depth (mm)
# rmin = initial root fraction; p = depletion fraction (MAD) before stress; sens = stage sensitivity
CROPS = {
    "Rice":      dict(dur=120, frac=(.15, .30, .35, .20), kc=(1.05, 1.10, 1.20, 0.90), root=500,  rmin=.50, p=0.20, ndvi_peak=0.85, sens=(0.6, 1.0, 1.4, 0.7)),
    "Cotton":    dict(dur=160, frac=(.15, .25, .35, .25), kc=(0.35, 0.70, 1.15, 0.70), root=1000, rmin=.30, p=0.65, ndvi_peak=0.78, sens=(0.5, 0.9, 1.4, 0.8)),
    "Maize":     dict(dur=110, frac=(.17, .28, .33, .22), kc=(0.40, 0.80, 1.15, 0.60), root=900,  rmin=.30, p=0.55, ndvi_peak=0.85, sens=(0.6, 1.0, 1.5, 0.7)),
    "Chilli":    dict(dur=140, frac=(.15, .25, .40, .20), kc=(0.60, 0.90, 1.05, 0.80), root=600,  rmin=.35, p=0.30, ndvi_peak=0.72, sens=(0.7, 1.0, 1.4, 0.9)),
    "Groundnut": dict(dur=110, frac=(.15, .25, .35, .25), kc=(0.40, 0.75, 1.05, 0.70), root=500,  rmin=.35, p=0.50, ndvi_peak=0.75, sens=(0.6, 1.0, 1.4, 0.8)),
}

# volumetric fractions (m3/m3); drain = daily fraction of water above FC that drains
SOILS = {
    "Sandy":      dict(wp=.06, fc=.12, sat=.40, bd=1.55, drain=.60),
    "Sandy Loam": dict(wp=.09, fc=.20, sat=.43, bd=1.45, drain=.45),
    "Loam":       dict(wp=.13, fc=.27, sat=.46, bd=1.35, drain=.35),
    "Clay Loam":  dict(wp=.19, fc=.34, sat=.48, bd=1.30, drain=.25),
    "Clay":       dict(wp=.25, fc=.41, sat=.52, bd=1.20, drain=.15),
}

METHODS = {"flood": (0.55, 0.70), "sprinkler": (0.70, 0.85), "drip": (0.85, 0.95)}
APP_RATE_MM_H = {"flood": (20, 35), "sprinkler": (6, 10), "drip": (2, 4)}  # field-equivalent


def stage_and_kc(crop, f):
    """Growth stage index and Kc (linearly interpolated between stage mid-points)."""
    c = CROPS[crop]
    cum = np.cumsum(c["frac"])
    idx = min(int(np.searchsorted(cum, f, side="right")), 3)
    mids = cum - np.array(c["frac"]) / 2
    return idx, float(np.interp(f, mids, c["kc"]))


def root_depth_mm(crop, f):
    c = CROPS[crop]
    return c["root"] * (c["rmin"] + (1 - c["rmin"]) * min(max(f / 0.55, 0.0), 1.0))


def ndvi_base(crop, f):
    """Expected healthy-canopy NDVI for crop at cycle fraction f (stage + crop effect)."""
    pk = CROPS[crop]["ndvi_peak"]
    return 0.20 + (pk - 0.20) * float(np.exp(-((f - 0.60) / 0.28) ** 2))


def water_balance_step(theta, pond, soil, zr, p, is_rice, et0, kc, rain, irr_net):
    """
    One day of the simplified root-zone water balance.
      S_today = S_yesterday + effective_rain + effective_irrigation - ETa - drainage
    theta: volumetric water content (m3/m3); zr: root-zone depth (mm); pond: rice ponding (mm)
    Returns dict of new state + diagnostics (all mm unless stated).
    """
    wp, fc, sat, drain = soil["wp"], soil["fc"], soil["sat"], soil["drain"]
    taw = (fc - wp) * zr
    etc = et0 * kc
    runoff = 0.0
    if not is_rice:
        runoff = 0.25 * max(rain - 20.0, 0.0) + (0.15 * max(rain - 8.0, 0.0) if theta > fc else 0.0)
    inflow = (rain - runoff) + irr_net
    infil = min(inflow, max(sat - theta, 0.0) * zr)
    excess = inflow - infil
    theta_i = theta + infil / zr
    if is_rice:
        pond += excess
        over = max(pond - 80.0, 0.0)
        pond -= over
        runoff += over
    else:
        runoff += excess
    drainage = 0.0
    if is_rice and pond > 0:
        perc = min(pond, drain * 10.0)       # puddled-soil percolation
        pond -= perc
        drainage += perc
    elif theta_i > fc:
        d = drain * (theta_i - fc) * zr
        theta_i -= d / zr
        drainage += d
    from_pond = 0.0
    if is_rice and pond > 0:
        from_pond = min(pond, etc)
        pond -= from_pond
    etc_soil = etc - from_pond
    W = max(theta_i - wp, 0.0) * zr
    crit = (1 - p) * taw
    ks = 1.0 if (etc_soil <= 1e-9 or crit <= 0) else min(W / crit, 1.0)
    eta_soil = min(etc_soil * ks, W)
    theta_e = max(theta_i - eta_soil / zr, wp)
    W_e = (theta_e - wp) * zr
    ks_end = 1.0 if (crit <= 0 or (is_rice and pond > 0)) else min(W_e / crit, 1.0)
    return dict(theta=theta_e, pond=pond, etc=etc, eta=eta_soil + from_pond, ks=ks, ks_end=ks_end,
                drainage=drainage, runoff=runoff, taw=taw, raw=p * taw,
                dep=max(fc - theta_e, 0.0) * zr, rew=(W_e / taw if taw > 0 else 0.0))


def simulate_scenario(state, forecast, plan):
    """
    What-If simulation.
    state    : dict(theta, pond, soil, zr, p, is_rice, kc)
    forecast : list of dict(et0, rain)   one per day
    plan     : list of gross irrigation (mm) per day
    Returns list of per-day dicts + totals (water used, stress days, min Ks).
    """
    th, pd_ = state["theta"], state["pond"]
    eff = state.get("eff", 0.75)
    out, used, stress_days = [], 0.0, 0
    for day, (wx, gross) in enumerate(zip(forecast, plan), 1):
        r = water_balance_step(th, pd_, state["soil"], state["zr"], state["p"], state["is_rice"],
                               wx["et0"], state["kc"], wx["rain"], gross * eff)
        th, pd_ = r["theta"], r["pond"]
        used += gross
        stress_days += int(r["ks_end"] < 0.7)
        out.append(dict(day=day, soil_moisture_pct=round(th * 100, 1), ks=round(r["ks_end"], 2),
                        rew=round(r["rew"], 2), drainage_mm=round(r["drainage"], 1)))
    return dict(days=out, water_used_mm=round(used, 1), stress_days=stress_days,
                min_ks=min(d["ks"] for d in out))


def explain(ctx, pred):
    """
    Reason codes for a recommendation.
    ctx  : dict with rew_prev, deficit_mm, raw_mm, kc, etc_mm, tmax, rain_forecast_24h_mm,
           growth_stage, ndvi_anomaly
    pred : dict with irrigation_needed (0/1), recommended_irrigation_mm, stress_risk_class
    """
    why = []
    ratio = ctx["deficit_mm"] / max(ctx["raw_mm"], 1e-6)
    why.append(f"Root-zone depletion is {ctx['deficit_mm']:.0f} mm, about {ratio*100:.0f}% of the stress threshold.")
    if ctx["rew_prev"] < 0.5:
        why.append(f"Extractable soil water is low ({ctx['rew_prev']*100:.0f}%).")
    why.append(f"Crop demand today is {ctx['etc_mm']:.1f} mm (Kc {ctx['kc']:.2f}, {ctx['growth_stage'].replace('_',' ').title()}).")
    if ctx["tmax"] >= 37:
        why.append(f"Heat ({ctx['tmax']:.0f} C) is raising water demand.")
    if ctx["rain_forecast_24h_mm"] >= 8:
        why.append(f"{ctx['rain_forecast_24h_mm']:.0f} mm of rain is forecast, so irrigation may be delayed.")
    if ctx.get("ndvi_anomaly", 0) < -0.08:
        why.append("Satellite NDVI is below the expected canopy for this stage (supporting signal only).")
    head = (f"Irrigate about {pred['recommended_irrigation_mm']:.0f} mm" if pred["irrigation_needed"]
            else "No irrigation needed now")
    return head + f" | stress risk: {pred['stress_risk_class']}", why


if __name__ == "__main__":
    soil = dict(SOILS["Loam"])
    st = dict(theta=0.17, pond=0.0, soil=soil, zr=700, p=0.55, is_rice=False, kc=1.15, eff=0.8)
    fc = [dict(et0=6.0, rain=0.0)] * 7
    for name, plan in {"No irrigation": [0] * 7, "Irrigate day 1": [35, 0, 0, 0, 0, 0, 0],
                       "Irrigate day 4": [0, 0, 0, 35, 0, 0, 0]}.items():
        r = simulate_scenario(st, fc, plan)
        print(name, "| water", r["water_used_mm"], "mm | stress days", r["stress_days"], "| min Ks", r["min_ks"])
