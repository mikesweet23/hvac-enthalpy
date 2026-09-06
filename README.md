# Enthalpy – HVAC psychrometrics PWA

A phone-first progressive web app for HVAC engineers. Dial in an air condition with sliders and watch the
dew point, enthalpy and the effect of a cooling coil and reheat update live.

## What it does

**A · Entering air** — dry-bulb (-50 … +50 °C), relative humidity and airflow (toggle L/s ↔ m³/h).
Outputs dew / frost point, enthalpy, wet bulb, moisture content, vapour pressure, density and dry-air mass flow.

**B · Cooling coil** — multi-toggle for coil type (DX, chilled water, high-temperature chilled water,
dehumidifier, custom or off). Each preset sets an apparatus dew point (ADP) and bypass factor which you can
fine-tune. Shows moisture extraction in **L/s or L/h** (plus L/day), leaving temperature and RH, and total /
sensible / latent cooling duty with the sensible heat ratio. Flags when the coil would run dry.

**C · Heat added** — toggle between room gains and a duct heater and set the kW. Moisture content is held
constant so you see how the final RH drops as the air warms. Quick buttons show the heat required to reach
18 / 21 / 24 °C.

A psychrometric chart plots the three states and the process lines, and all inputs persist on the device.

## Method

- Saturation pressure: ASHRAE Fundamentals / Hyland–Wexler correlations (over ice below 0 °C).
- Enthalpy `h = 1.006·t + W·(2501 + 1.86·t)` kJ/kg dry air; specific volume from the ideal-gas relation.
- Dew point and wet bulb solved iteratively.
- Coil: leaving state is the mixture of the bypassed fraction of entering air and air saturated at the ADP.
  Condensate rate = dry-air mass flow × ΔW, with water taken as 1 kg/L.
- Heating: constant-W enthalpy rise `Q = ṁ·Δh`.
- Standard atmospheric pressure (101.325 kPa) throughout.

## Running locally

```bash
npm install
npm run dev        # http://127.0.0.1:4731
```

Other scripts:

```bash
npm test           # psychrometric unit tests (vitest)
npm run build      # production build to dist/ (includes service worker + manifest)
npm run preview    # serve the production build on http://127.0.0.1:4732
npm run icons      # regenerate PNG icons from public/favicon.svg
npm run lint
```

## Installing on a phone

Deploy the `dist/` folder to any static host served over HTTPS (Cloudflare Pages, Netlify, Vercel, GitHub
Pages, …). Then:

- **Android / Chrome** – tap the *Install* button in the header, or the browser's "Add to Home screen".
- **iOS / Safari** – Share → *Add to Home Screen*.

The app is fully offline-capable once installed; updates are picked up automatically on the next launch.

## Stack

Vite 8 · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui · vite-plugin-pwa (Workbox) · Vitest
