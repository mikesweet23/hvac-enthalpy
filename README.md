# Enthalpy – HVAC psychrometrics PWA

A phone-first progressive web app for HVAC engineers. Dial in an air condition with sliders and watch the
dew point, enthalpy and the effect of a cooling coil and reheat update live.

## What it does

**A · Entering air** — dry-bulb (-50 … +50 °C), relative humidity and airflow on a log slider from
10 L/s to 100 000 m³/h (toggle L/s ↔ m³/h). Outputs dew / frost point, enthalpy, wet bulb, moisture content,
vapour pressure, density and dry-air mass flow.

**B · Cooling coil** — multi-toggle for coil type by rows: DX 3R / 4R / 5R / 6R, CHW 6R / 8R, a
low-temperature freezer evaporator, custom or off. Each preset sets a typical apparatus dew point (ADP) and
bypass factor, shows a description and an example application (e.g. DX 4R → VRF and split systems, DX 6R →
deep dehumidification), and both values can be fine-tuned. Shows moisture extraction in **L/s or L/h**, split
into **liquid to drain** and **held as frost**, leaving temperature and RH, and total / sensible / latent duty
with the sensible heat ratio. Flags when the coil would run dry.

When the ADP is below 0 °C the coil frosts: removed moisture is held on the fins as ice, the coil load includes
the heat of fusion plus sub-cooling of the ice, and a defrost panel shows frost mass after a chosen run time,
meltwater released at defrost and the defrost energy (ice warming + melting).

**C · Heat added** — toggle between room gains and a duct heater and set the kW. Moisture content is held
constant so you see how the final RH drops as the air warms. Quick buttons show the heat required to reach
18 / 21 / 24 °C.

**Target room condition** — enter the condition you have to hit (e.g. 21 °C ± 2 K at 45 % RH). The panel
shows the RH you would get at the target temperature and the heat to get there, the temperature at which the
target RH is reached and whether that falls inside the band, the RH range across the band, and – when heating
alone can't do it – how much moisture the coil (or a humidifier) has to remove or add. One tap sets the heater
to either answer.

A psychrometric chart plots the three states and the process lines, and all inputs persist on the device.

**Project reference & PDF** — give the calculation a project reference and optional notes, then *Save as PDF*
to get an A4 report with all inputs, the A/B/C results and the chart. On phones the PDF goes to the share
sheet (Save to Files, Drive, mail…); on desktop it downloads.

## Method

- Saturation pressure: ASHRAE Fundamentals / Hyland–Wexler correlations (over ice below 0 °C).
- Enthalpy `h = 1.006·t + W·(2501 + 1.86·t)` kJ/kg dry air; specific volume from the ideal-gas relation.
- Dew point and wet bulb solved iteratively.
- Coil: leaving state is the mixture of the bypassed fraction of entering air and air saturated at the ADP.
  Condensate rate = dry-air mass flow × ΔW, with water taken as 1 kg/L.
- Frost (ADP < 0 °C): coil load `Q = ṁ·Δh + ṁ_w·(333.6 + c̄_ice·|ADP|)` where the ice specific heat
  `c_ice(T) = 2.108 + 0.0077·T` kJ/kg·K (2.11 at 0 °C → 1.72 at -50 °C) is averaged over 0 → ADP.
  Defrost energy = frost mass × (c̄_ice·|ADP| + 333.6) kJ.
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

## Hosting on GitHub Pages (free)

The repo ships with a GitHub Actions workflow (`.github/workflows/deploy.yml`) that builds and publishes the
app every time `main` is pushed.

1. Push this repository to GitHub.
2. In the repo on GitHub go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push (or re-run the workflow from the **Actions** tab). After a minute the app is live at
   `https://<your-username>.github.io/<repo-name>/`.

The workflow sets `VITE_BASE=/<repo-name>/` so the app works under the project sub-path. If you serve it from
a root domain instead, build with the default base (`npm run build`).

**Renamed the repository?** The base path is baked into the build, so the currently published site keeps
pointing at the old `/<old-repo-name>/` URLs and renders blank at the new address. Redeploy once – push any
commit to `main` or re-run **Deploy to GitHub Pages** from the **Actions** tab – and the new name is picked up
automatically.

## Installing on a phone

Open the hosted URL on your phone (it must be HTTPS – GitHub Pages is) and tap **Add to Home Screen** in the
header:

- **Android / Chrome** – the native install prompt appears; other Android browsers get step-by-step instructions.
- **iOS** – a sheet walks you through Share → *Add to Home Screen* (Safari, Chrome, Edge and Firefox on iOS).

The button disappears once the app is running from the home screen.

The app is fully offline-capable once installed; updates are picked up automatically on the next launch.

## Stack

Vite 8 · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui · vite-plugin-pwa (Workbox) · Vitest
