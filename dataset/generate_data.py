"""
AquaTwin synthetic field-day generator (deterministic, seed=42).
100 fields, split BY FIELD: F001-F070 train (30,000 rows), F071-F085 val (5,000), F086-F100 test (5,000).
All data are SYNTHETIC. Locations are not real farms.
Usage: python generate_data.py [outdir]
"""
import os, sys, json
import numpy as np
import pandas as pd
from aquatwin_twin import (CROPS, STAGES, SOILS, METHODS, APP_RATE_MM_H, SEED,
                           stage_and_kc, root_depth_mm, ndvi_base, water_balance_step)

SPLITS = [("train", 0, 70, 30000), ("val", 70, 85, 5000), ("test", 85, 100, 5000)]
CROP_LIST = list(CROPS)
# trigger (x RAW), act prob, amount factor, min interval, rice pond trigger (mm)
FARMERS = {"diligent": (0.75, 0.90, 1.0, 3, 15), "average": (1.0, 0.65, 1.0, 3, 8),
           "lazy": (1.35, 0.40, 0.9, 4, 0), "over_irrigator": (0.5, 0.85, 1.3, 2, 25)}


def allocate(total, k):
    b, r = divmod(total, k)
    return [b + (1 if i < r else 0) for i in range(k)]


def e0(T):
    return 0.6108 * np.exp(17.27 * T / (T + 237.3))


def gen_weather(rng, dates, f):
    n = len(dates)
    doy = dates.dayofyear.values.astype(float)
    w_mon = np.exp(-((doy - 215) / 45) ** 2)
    w_post = np.exp(-((doy - 300) / 25) ** 2)
    w_pre = np.exp(-((doy - 125) / 22) ** 2)
    p_wet = np.clip(0.03 + 0.40 * w_mon + 0.18 * w_post + 0.06 * w_pre, 0, 0.9) * f["rain_mult"]
    wet = np.zeros(n, bool); prev = False
    cloud_add = np.zeros(n); hw = np.zeros(n)
    for t in range(n):
        pt = min(0.9, p_wet[t] + 0.18) if prev else max(0.0, p_wet[t] - 0.10)
        prev = rng.random() < pt
        wet[t] = prev
        if rng.random() < 0.012:
            cloud_add[t:t + rng.integers(3, 7)] = 0.35
        if 80 < doy[t] < 175 and rng.random() < 0.012:
            hw[t:t + rng.integers(4, 8)] = rng.uniform(0.8, 1.2)
    rain = np.zeros(n)
    k = int(wet.sum())
    amt = rng.gamma(0.8, 8 + 10 * w_mon[wet] + 4 * w_post[wet], size=k) + 0.3
    heavy = rng.random(k) < 0.05
    amt[heavy] *= rng.uniform(3, 6, heavy.sum())
    rain[wet] = np.minimum(amt, 180.0)
    e = np.zeros(n)
    for t in range(1, n):
        e[t] = 0.7 * e[t - 1] + rng.normal(0, 0.12)
    cloud = np.clip(0.12 + 0.35 * w_mon + 0.25 * wet + e + cloud_add, 0, 1)
    en = np.zeros(n)
    for t in range(1, n):
        en[t] = 0.6 * en[t - 1] + rng.normal(0, 1.2)
    tmax = 33 + 4 * np.sin(2 * np.pi * (doy - 50) / 365) - 2.5 * w_mon - 1.5 * w_post
    tmax = np.clip(tmax + f["tdelta"] - 3.0 * cloud - 3.0 * wet + 5.0 * hw + en, 20, 47)
    dtr = np.clip(11.5 - 6 * cloud + rng.normal(0, 1.0, n), 4, 14)
    tmin = np.clip(tmax - dtr, 12, None)
    tmean = (tmax + tmin) / 2
    rh = np.clip(48 + 30 * w_mon + 8 * w_post + 14 * cloud + 18 * wet - 1.1 * (tmax - 32)
                 - 12 * hw + rng.normal(0, 5, n), 20, 98)
    wind = np.clip(rng.gamma(4, (1.4 + 1.2 * w_mon + 0.5 * hw) / 4), 0.3, 8)
    rso = 23 + 2.5 * np.sin(2 * np.pi * (doy - 80) / 365)
    rs = np.clip(rso * (1 - 0.72 * cloud ** 1.4) + rng.normal(0, 0.6, n), 3, 28)
    P = 101.3 * np.exp(-f["elev"] / 8200) - 0.5 * w_mon + rng.normal(0, 0.25, n)
    # FAO-56 Penman-Monteith (G = 0)
    es = (e0(tmax) + e0(tmin)) / 2
    ea = rh / 100 * es
    delta = 4098 * e0(tmean) / (tmean + 237.3) ** 2
    gamma = 0.000665 * P
    rnl = 4.903e-9 * (((tmax + 273.16) ** 4 + (tmin + 273.16) ** 4) / 2) * (0.34 - 0.14 * np.sqrt(ea)) \
        * (1.35 * np.clip(rs / rso, 0.3, 1) - 0.35)
    rn = 0.77 * rs - rnl
    et0 = (0.408 * delta * rn + gamma * 900 / (tmean + 273) * wind * (es - ea)) / (delta + gamma * (1 + 0.34 * wind))
    et0 = np.clip(et0, 0.3, 10.0)
    regime = np.where(hw > 0, "heat_wave",
             np.where((doy >= 166) & (doy <= 273), "monsoon",
             np.where((doy >= 274) & (doy <= 334), "post_monsoon",
             np.where(cloud > 0.65, "cloudy",
             np.where((rh >= 60) & (tmax >= 31), "hot_humid",
             np.where(tmax >= 32, "hot_dry", "winter_mild"))))))
    return dict(rain=rain, tmean=tmean, tmax=tmax, tmin=tmin, rh=rh, wind=wind, rs=rs, P=P,
                et0=et0, cloud=cloud, regime=regime)


def make_field(i, rng):
    sn = rng.choice(list(SOILS), p=[.15, .25, .25, .20, .15])
    s = SOILS[sn]
    wp = s["wp"] * rng.uniform(.93, 1.07)
    fc = max(s["fc"] * rng.uniform(.95, 1.05), wp + .04)
    sat = max(s["sat"] * rng.uniform(.96, 1.04), fc + .07)
    soil = dict(wp=wp, fc=fc, sat=sat, bd=s["bd"] * rng.uniform(.96, 1.04), drain=s["drain"] * rng.uniform(.85, 1.15))
    return dict(idx=i, field_id=f"F{i + 1:03d}", soil_type=sn, soil=soil,
                lat=rng.uniform(15.5, 18.5), lon=rng.uniform(77.0, 82.5), elev=rng.uniform(20, 650),
                root_limit=rng.uniform(600, 1200), tdelta=rng.normal(0, 0.8), rain_mult=rng.uniform(1.0, 1.6),
                farmer=rng.choice(list(FARMERS), p=[.28, .32, .25, .15]), health=rng.normal(0, 0.03),
                obs_phase=int(rng.integers(0, 5)), start=pd.Timestamp("2021-01-01") + pd.Timedelta(days=int(rng.integers(0, 365))))


def new_cycle(f, k, rng):
    crop = CROP_LIST[(f["idx"] + k) % len(CROP_LIST)]
    c = CROPS[crop]
    dur = int(c["dur"] * rng.uniform(.93, 1.07))
    mp = [.85, .15, 0.0] if crop == "Rice" else [.35, .30, .35]
    method = str(rng.choice(["flood", "sprinkler", "drip"], p=mp))
    lo, hi = METHODS[method]
    rlo, rhi = APP_RATE_MM_H[method]
    return dict(crop=crop, dur=dur, method=method, eff_nom=rng.uniform(lo, hi), rate=rng.uniform(rlo, rhi))


def simulate_field(f, n, seed):
    rng = np.random.default_rng([seed, f["idx"]])
    dates = pd.date_range(f["start"], periods=n, freq="D")
    W = gen_weather(rng, dates, f)
    soil = f["soil"]
    k = 0
    cyc = new_cycle(f, k, rng)
    d = int(rng.uniform(0, .75) * cyc["dur"])
    theta = soil["fc"] * rng.uniform(.6, .95)
    pond = 0.0
    zr_prev = None
    trig, prob, fac, min_int, rice_trig = FARMERS[f["farmer"]]
    days_since_irr, dry_run = 30, 0
    s_ema = y_ema = 0.0
    ndvi_o = ndwi_o = evi_o = None
    since_obs = 0
    rows = []
    for t in range(n):
        if d >= cyc["dur"]:
            k += 1; cyc = new_cycle(f, k, rng); d = 0
        crop, c = cyc["crop"], CROPS[cyc["crop"]]
        is_rice = crop == "Rice"
        fr = d / cyc["dur"]
        si, kc = stage_and_kc(crop, fr)
        zr = min(root_depth_mm(crop, fr), f["root_limit"])
        if zr_prev is not None and zr > zr_prev:           # roots reach slightly drier-than-FC deeper water
            theta = (theta * zr_prev + soil["fc"] * 0.9 * (zr - zr_prev)) / zr
        if d == 0 and is_rice:
            pond = max(pond, 30.0)                          # puddling / land preparation
        zr_prev = zr
        et0, rain = W["et0"][t], W["rain"][t]
        taw = (soil["fc"] - soil["wp"]) * zr
        raw = c["p"] * taw
        theta0, pond0 = theta, pond
        dep0 = max(soil["fc"] - theta0, 0) * zr
        rew0 = max(theta0 - soil["wp"], 0) * zr / taw
        # ---- farmer behaviour (noisy, no knowledge of future rain) ----
        irr_gross = irr_net = 0.0
        eff = cyc["eff_nom"] * rng.uniform(.96, 1.04)
        eff = float(np.clip(eff, *[(METHODS[cyc["method"]][0] - .02), METHODS[cyc["method"]][1] + .02]))
        act = (rain < 8) and (days_since_irr >= min_int) and (rng.random() < prob)
        if act:
            if is_rice:
                if pond0 < rice_trig:
                    irr_net = max(50 - pond0, 10) * fac
            elif dep0 > trig * raw:
                irr_net = max(dep0 * fac, 8.0)
            if irr_net > 0:
                irr_gross = min(irr_net / eff, 120.0)
                irr_net = irr_gross * eff
        dur_min = round(irr_gross / cyc["rate"] * 60 * rng.uniform(.95, 1.05)) if irr_gross > 0 else 0
        # ---- twin step (without and with today's irrigation) ----
        args = (soil, zr, c["p"], is_rice, et0, kc, rain)
        r0 = water_balance_step(theta0, pond0, *args, 0.0)
        r1 = water_balance_step(theta0, pond0, *args, irr_net) if irr_net > 0 else r0
        # ---- labels: look-ahead 24h on the no-irrigation trajectory ----
        rain_n = W["rain"][t + 1] if t + 1 < n else 0.0
        et0_n = W["et0"][t + 1] if t + 1 < n else et0
        rain_n_eff = 0.85 * (rain_n - 0.25 * max(rain_n - 20, 0))
        etc_n = et0_n * kc
        if is_rice:
            pond_h = r0["pond"] - (etc_n + f["soil"]["drain"] * 10) + rain_n_eff
            dr_h = max(r0["dep"] + etc_n - rain_n_eff, 0)
            need = int(pond_h + rng.normal(0, 4) < 10) if r0["pond"] > 0 else int(dr_h + rng.normal(0, .05 * taw) > 0.2 * taw)
            rec_net = float(np.clip(55 - max(pond_h, 0), 0, 70)) if need else 0.0
        else:
            dr_h = float(np.clip(r0["dep"] + etc_n - rain_n_eff, 0, taw))
            need = int(dr_h - raw + rng.normal(0, .05 * taw) > 0)
            rec_net = max(dr_h, 8.0) if need else 0.0
        rec = float(np.clip(rec_net / cyc["eff_nom"], 0, 120) * rng.lognormal(0, .05)) if need else 0.0
        deficit = max(r0["dep"] + rng.normal(0, .02 * taw + .3), 0)
        # ---- stress ground truth from the twin (end-of-day state incl. irrigation) ----
        sw = 0.5 * (1 - r1["ks"]) + 0.5 * (1 - r1["ks_end"])
        wc = sw ** 0.65
        appr = float(np.clip((r1['dep'] / max(raw, 1e-6) - 0.7) / 0.6, 0, 1)) if not (is_rice and r1['pond'] > 0) else 0.0
        heat = float(np.clip((W["tmax"][t] - 36) / 8, 0, 1))
        dsp = min(dry_run / 15, 1)
        score = (0.65 * wc + 0.25 * appr * (1 - wc) + 0.07 * heat * (0.5 + wc) + 0.05 * dsp * (0.5 + wc) + 0.08 * min(1, 2 * s_ema))
        score = float(np.clip(score * (0.9, 1.0, 1.15, 0.95)[si] + rng.normal(0, .025), 0, 1))
        cls = "LOW" if score < 0.18 else ("MEDIUM" if score < 0.40 else "HIGH")
        sprob = float(np.clip(1 / (1 + np.exp(-9 * (score - 0.35))) + rng.normal(0, .02), 0, 1))
        y_ema = y_ema * 0.95 + 0.05 * score * c["sens"][si]
        yrisk = float(np.clip(2.2 * y_ema + rng.normal(0, .02), 0, 1))
        # ---- NDVI / NDWI / EVI (Sentinel-2-like, revisit ~5 d, cloud gaps) ----
        base = ndvi_base(crop, fr)
        ndvi_t = float(np.clip(base + f["health"] - 0.30 * s_ema + rng.normal(0, .015), .08, .95))
        ndwi_t = -0.38 + 0.38 * rew0 + 0.30 * (ndvi_t - 0.4) + (0.10 if (is_rice and pond0 > 5) else 0)
        if ndvi_o is None or ((t + f["obs_phase"]) % 5 == 0):
            if ndvi_o is None or rng.random() > (0.5 if W["cloud"][t] > 0.6 else 0.05):
                ndvi_o = float(np.clip(ndvi_t + rng.normal(0, .02), 0, 1))
                ndwi_o = float(ndwi_t + rng.normal(0, .03))
                evi_o = float(0.9 * ndvi_t - 0.12 + rng.normal(0, .025))
                since_obs = 0
        fvc = float(np.clip(((ndvi_o - 0.2) / 0.65) ** 2, 0, 1))
        anom = ndvi_o - base
        canopy = "GOOD" if anom > -0.04 else ("MODERATE" if anom > -0.12 else "POOR")
        rows.append(dict(
            field_id=f["field_id"], date=dates[t].date().isoformat(), day_of_year=int(dates[t].dayofyear),
            latitude=round(f["lat"], 4), longitude=round(f["lon"], 4), elevation_m=round(f["elev"]),
            crop=crop, growth_stage=STAGES[si], day_in_cycle=d, crop_day_fraction=round(fr, 3),
            kc=round(kc, 3), root_depth_mm=round(zr), soil_type=f["soil_type"],
            field_capacity=round(soil["fc"], 3), wilting_point=round(soil["wp"], 3), saturation=round(soil["sat"], 3),
            bulk_density=round(soil["bd"], 2), root_zone_depth_mm=round(f["root_limit"]),
            available_water_capacity=round(soil["fc"] - soil["wp"], 3), farmer_profile=f["farmer"],
            weather_regime=W["regime"][t], temperature_c=round(W["tmean"][t], 1), min_temperature_c=round(W["tmin"][t], 1),
            max_temperature_c=round(W["tmax"][t], 1), rainfall_mm=round(rain, 1), relative_humidity_pct=round(W["rh"][t], 1),
            wind_speed_mps=round(W["wind"][t], 2), solar_radiation_mj_m2=round(W["rs"][t], 2), pressure_kpa=round(W["P"][t], 2),
            reference_et0_mm=round(et0, 2), etc_mm=round(et0 * kc, 2),
            irrigation_applied_mm=round(irr_gross, 1), irrigation_duration_minutes=int(dur_min),
            irrigation_method=cyc["method"], irrigation_efficiency=round(eff, 3),
            irrigation_net_mm=round(irr_net, 1), days_since_last_irrigation=days_since_irr, consecutive_dry_days=dry_run,
            ndvi=round(ndvi_o, 3), evi=round(evi_o, 3), ndwi=round(ndwi_o, 3), vegetation_fraction=round(fvc, 3),
            ndvi_anomaly=round(anom, 3), canopy_condition=canopy, days_since_satellite_obs=since_obs,
            soil_moisture_prev_pct=round(theta0 * 100 + rng.normal(0, 1.0), 2),
            rew_prev=round(float(np.clip(rew0 + rng.normal(0, .03), 0, 1)), 3), ponding_mm=round(pond0, 1),
            raw_mm=round(raw, 1), taw_mm=round(taw, 1),
            # diagnostics (NOT features)
            twin_ks=round(r1["ks_end"], 3), twin_eta_mm=round(r1["eta"], 2), twin_drainage_mm=round(r1["drainage"], 2),
            twin_runoff_mm=round(r1["runoff"], 2), twin_rew_end=round(r1["rew"], 3), stress_score=round(score, 3),
            # targets
            irrigation_needed=int(need), stress_risk_class=cls, stress_probability=round(sprob, 3),
            recommended_irrigation_mm=round(rec, 1), water_deficit_mm=round(deficit, 2),
            estimated_soil_moisture_pct=round(r1["theta"] * 100 + rng.normal(0, .7), 2), yield_risk_score=round(yrisk, 3)))
        # ---- advance state ----
        theta, pond = r1["theta"], r1["pond"]
        s_ema = s_ema * 0.88 + 0.12 * score
        days_since_irr = 0 if irr_gross > 0 else min(days_since_irr + 1, 60)
        dry_run = dry_run + 1 if rain < 2 else 0
        since_obs += 1
        d += 1
    df = pd.DataFrame(rows)
    nxt = df["rainfall_mm"].shift(-1).fillna(0.0).values
    fc_ = np.where(nxt > 0, nxt * rng.uniform(.6, 1.4, n) + rng.normal(0, 2, n), np.maximum(rng.normal(0, 1.5, n), 0))
    df["rain_forecast_24h_mm"] = np.clip(fc_, 0, None).round(1)
    return df


def add_rolling(df):
    g = df.groupby("field_id", sort=False)
    r = lambda col, w, how="sum": g[col].transform(lambda s: getattr(s.rolling(w, min_periods=1), how)())
    df["rain_3d_mm"], df["rain_7d_mm"], df["rain_14d_mm"] = r("rainfall_mm", 3), r("rainfall_mm", 7), r("rainfall_mm", 14)
    df["et0_3d_mean"] = r("reference_et0_mm", 3, "mean")
    df["etc_7d_mm"], df["etc_14d_mm"] = r("etc_mm", 7), r("etc_mm", 14)
    df["tmax_3d_mean"] = r("max_temperature_c", 3, "mean")
    df["irr_net_7d_mm"], df["irr_net_14d_mm"] = r("irrigation_net_mm", 7), r("irrigation_net_mm", 14)
    prior = g["irrigation_net_mm"].shift(1).fillna(0.0)
    df["irr_prior_3d_mm"] = prior.groupby(df["field_id"]).transform(lambda s: s.rolling(3, min_periods=1).sum())
    df["irr_prior_7d_mm"] = prior.groupby(df["field_id"]).transform(lambda s: s.rolling(7, min_periods=1).sum())
    return df


def main(out):
    os.makedirs(out, exist_ok=True)
    frames, meta = {}, {}
    fields = [make_field(i, np.random.default_rng([SEED, 10_000 + i])) for i in range(100)]
    for name, a, b, total in SPLITS:
        parts = [simulate_field(fields[i], nd, SEED) for i, nd in zip(range(a, b), allocate(total, b - a))]
        df = add_rolling(pd.concat(parts, ignore_index=True))
        df.to_csv(os.path.join(out, f"{name}.csv"), index=False)
        frames[name] = df
        meta[name] = dict(rows=len(df), fields=f"F{a+1:03d}-F{b:03d}")
    pd.DataFrame([{k: v for k, v in f.items() if k not in ("soil", "start")} | f["soil"] | {"start": str(f["start"].date())}
                  for f in fields]).to_csv(os.path.join(out, "fields.csv"), index=False)
    json.dump(dict(seed=SEED, synthetic=True, splits=meta,
                   note="Synthetic data from a simplified water-balance model. Not real-farm accuracy."),
              open(os.path.join(out, "dataset_meta.json"), "w"), indent=2)
    print(json.dumps(meta, indent=1))
    return frames


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "data")
