<div align="center">

# 🛰️ AstroSentinel

### Offline-first medical intelligence for crews beyond Earth's reach

**NASA Space Apps Challenge** · Next.js 16 · TypeScript · Tailwind CSS 4 · native Web APIs only

`Demo build · synthetic data calibrated on NASA open-data ranges`

</div>

---

## The problem

At Mars, a radio signal needs **about 3 to 22 minutes each way**, so a question and its answer take up to **44 minutes**. Around solar conjunction the Sun blocks the link entirely for roughly two weeks. A medical emergency cannot wait for Houston.

Today's astronaut health monitoring assumes the ground is always listening. **AstroSentinel flips that assumption**: every risk calculation, alert and recommended action runs on board. Earth receives store-and-forward digests whenever the link allows.

## What it does

| | Feature | Why it matters |
|---|---|---|
| 🧠 | **Explainable risk engine** | A 0–100 score built from z-scores against each astronaut's *own* preflight baseline. Every point is traced to a biomarker, so there is no black box. |
| 📡 | **Deep-Space Link Visualiser** ⭐ *new* | A live canvas of the Mars ⇄ Earth channel. Every digest packet flies across at the real scaled light time. During loss of signal (LOS) the packets pile up in a buffer orbiting Mars, ground replies fly back as amber diamonds, and solar particle storms stream from the Sun. |
| 🔁 | **Delay-tolerant sync** | Digests are created every 10 sim-minutes. During LOS they are buffered on board, and they are delivered only after the configured light time. Ground replies obey the same physics. |
| 🧬 | **Mechanism-aware biomarkers** | A live pathway strip (Notch axis → Jag2 → Notch4 → BBB) with scientific tooltips that explain each step to non-specialists. |
| 🫀 | **Interactive digital twin** | Click the head, chest or arm to open deep telemetry: estimated intracranial pressure, the Kᴛʀᴀɴs leakage index, SANS risk, Jag2 expression, Notch4 activity, flow-mediated dilation and integrated dose. |
| 🤖 | **Hands-free AI Medical Copilot** | Voice queries through the browser's native `SpeechRecognition`, spoken replies through `speechSynthesis`, and an automatic critical alert when Notch signaling destabilises. |
| 🔊 | **Audio telemetry** | Web Audio API: a soft sonar ping while nominal, a lower ping on Watch, and a two-tone klaxon when the status flips to Alert. A one-click mute is in the top bar. |
| 📈 | **72 h what-if forecast** | Drag an extra dose (0–40 mSv) and watch the projected NDI peak arrive about 72 h later. |
| ✅ | **On-board checklist** | Rule-based actions (shelter, repeat IOP, notify the Crew Medical Officer). Ticked actions travel to Earth inside the next digest. |
| 🛰️ | **Mission Control view** | A crew table frozen at the last *received* state, a 14-day NDI history with event markers, a reply uplink and a one-page printable report. |
| 🔐 | **OS-grade access** | A simulated biometric face scan for the crew console and a clearance PIN with a decryption sequence for Mission Control. |

Everything runs in **one Next.js app with no database and no external services**. The simulator, risk engine and delay-tolerant queue live in server memory and stream to the browser over Server-Sent Events.

## ⭐ Final feature: Deep-Space Link Visualiser

Judges understand "offline-first" the moment they **see** it. The visualiser is a `<canvas>` rendered with `requestAnimationFrame` and fed by real packet timestamps from the server:

- **Physically timed packets.** Each dot's position = `(now − sentAt) / (deliverAt − sentAt)` along the light-time arc, so a 12-minute link really takes 12 (scaled) seconds to cross. Dots are coloured by the crew member's risk status.
- **Store-and-forward made visible.** Cut the link and the beam turns red with a LOSS OF SIGNAL marker. New digests start orbiting Mars as a growing amber buffer. Restore it and the whole buffer launches toward Earth at once.
- **Two-way traffic.** Mission Control replies cross back from Earth to Mars as amber diamonds. Replies sent during LOS wait in a ring around Earth.
- **Space weather.** Trigger a solar event and the Sun swells and fires a particle stream at Mars, the same event that drives the dose spike and the NDI rise.
- **Accessible.** A live `aria-label` summarises the link state for screen readers, and motion respects `prefers-reduced-motion`.

It appears on both `/crew` and `/ground`, so both ends of the mission watch the same packets in flight.

## Scientific basis

AstroSentinel tracks one mechanistic chain: **space radiation → endothelial Notch disruption → vascular and blood-brain-barrier vulnerability**, plus the best-known microgravity eye risk.

**Notch signaling.** Notch is a contact-dependent pathway. A ligand on one cell (Jagged or Delta-like) binds a Notch receptor on a neighbouring cell, and the receptor is cleaved to switch on target genes. In blood vessels, Notch controls sprouting, arterial identity and the quiescence of mature endothelium. Ionising radiation and microgravity are studied as stressors of vascular biology. The **Notch Disruption Index (NDI, 0–100)** is AstroSentinel's composite marker for this axis.

**Endothelial Jagged-2 (Jag2).** One of the Notch ligands expressed by endothelial cells. It helps coordinate vessel maturation and endothelial–pericyte contact. A shift in Jag2 expression signals an unbalanced Notch axis, which is why the copilot recommends monitoring it after radiation exposure.

**Notch4.** A Notch receptor found mainly on vascular endothelium. The pathway must stay balanced: in mice, constitutively active Notch4 causes arteriovenous malformations.

**Blood-brain barrier (BBB).** Brain capillary endothelium, sealed by tight junctions (claudin-5, occludin) and supported by pericytes and astrocyte end-feet, keeps blood-borne molecules out of neural tissue. Endothelial–pericyte Notch signaling contributes to barrier maintenance. Ionising radiation increases BBB permeability in animal studies.

**Intraocular pressure and SANS.** Microgravity shifts fluid toward the head. Many long-duration crew members develop Spaceflight-Associated Neuro-ocular Syndrome (optic disc swelling, globe flattening, choroidal folds). IOP is a fast on-board proxy.

**Radiation dose.** Galactic cosmic rays set a steady background, and a solar particle event can raise the dose rate by orders of magnitude for hours. Dose is weighted as a *driver*, so the crew can shelter before biomarkers move.

### Risk model

```
z_i     = (value_i − preflight_mean_i) / preflight_sd_i
score   = Σ w_i · clamp(z_i, 0, 4) / 4 · 100
weights = NDI 0.40 · dose 0.25 · IOP 0.20 · BBB 0.15
status  = Nominal < 45 ≤ Watch ≤ 75 < Alert
```

Every contribution is shown as a bar with its z-score, its points and its share of the total. Heart rate is displayed but not weighted, because it moves with exercise.

### Honesty statement

All values are **synthetic**. Baselines and ranges are calibrated to plausible physiological ranges informed by NASA open science resources (NASA Open Science Data Repository / GeneLab, the NASA Twins Study, the Life Sciences Data Archive). Derived readouts such as Jag2 expression, Notch4 activity, intracranial pressure and Kᴛʀᴀɴs are illustrative models, not measurements. AstroSentinel is **decision support, not a diagnosis. A human crew medical officer confirms every action.**

## How to run

Requirements: Node.js 20+.

```bash
npm install
npm run dev
```

Open **http://localhost:3000**.

If styles look stale after pulling changes, stop the server, delete the `.next` folder and start again.

| Route | What it is |
|---|---|
| `/` | Secure lock screen |
| `/crew` | On-board crew console (face scan) |
| `/ground` | Mission Control (PIN **1969**) |
| `/dashboard` | Original single-page dashboard |

**Time scale: 1 real second = 1 simulated minute.** Restarting the server resets the simulation.

## 🎬 Demo script (about 3 minutes)

Use Chrome or Edge with the sound on. Open two windows side by side.

1. **Lock screen.** On `/`, click **Crew console → Authenticate & launch**. The face scan maps landmarks and shows *Access granted* (simulated; no camera is used).
2. **Mission Control.** In the second window open `/`, click **Ground segment** and type **1969** (the Apollo 11 year). Watch the channel decrypt.
3. **Nominal ops.** On `/crew`, click anywhere once to enable audio; you will hear the soft sonar ping. The light time defaults to **12 min**. Point at the **Deep-Space Link** panel: digests fly from Mars to Earth and land on `/ground` about 12 s later.
4. **Explain the science.** Hover the **ⓘ** icons on the Notch axis → Jag2 → Notch4 → BBB mechanism strip.
5. **Solar storm.** Click **Trigger solar event**. The Sun flares and particles stream at Mars. The dose spikes, NDI climbs, the gauge turns red, the klaxon sounds, and the copilot announces the Notch-signaling warning aloud.
6. **Digital twin.** Click the **chest** on the astronaut to show Jag2 expression and Notch4 activity reacting live.
7. **Lose Earth.** Click **Cut link (LOS)**. The beam breaks, the buffer around Mars grows and `/ground` freezes on the last received state. The crew console keeps working.
8. **Blind reply.** On `/ground`, send *"Copy. Shelter now, repeat IOP at T+2h."* It shows **Waiting for link** and a diamond waits at Earth.
9. **Restore.** Click **Restore link (UP)**. The buffered packets launch toward Earth and the reply flies toward Mars. About 12 s later Mission Control sees the alert spike and the actions taken, and the reply lands in the crew event log.
10. **Hands-free.** Tap the 🎙 mic in the copilot and ask *"How do we treat vascular degradation?"* The answer is spoken back.
11. **What-if.** Drag the dose slider and the 72 h forecast redraws.
12. **Report.** On `/ground`, click **Export report** for a clean one-page printout.

**Delay buttons:** `0` (zero-delay test), `3` (closest approach), `12` (typical), `22` (farthest) minutes one-way.

## Architecture

```
lib/
  engine.ts      pure functions: baseline, z-score, EWMA, 24 h delta, risk, forecast, checklist, vascular axis
  sim.ts         synthetic crew generator (CM-1…CM-4), 14-day history, solar-event physics
  store.ts       server singleton: 1 s tick, controls, store-and-forward queue, inbox, uplink, link snapshot
app/
  api/stream          GET  SSE crew state every second
  api/control         POST {linkUp?, delayMin?, sunEvent?, action?}
  api/ground          GET  delivered digests, crew table, 14-day history, link snapshot
  api/ground/reply    POST {crewId, text}
  api/forecast        POST {extraDoseMSv} → 72 h NDI series
  page.tsx            lock screen (face scan + clearance PIN)
  crew/page.tsx       on-board console
  ground/page.tsx     Mission Control
components/astro/
  DeepSpaceLink.tsx   canvas light-time visualiser
  Copilot.tsx         voice copilot (SpeechRecognition + speechSynthesis)
  audio.ts            Web Audio telemetry (ping, klaxon, UI blips)
  ZoneModal.tsx       digital-twin deep telemetry
  Auth.tsx            biometric scan + PIN decryption
  ui.tsx              glass panels, status chips, sparklines, scientific tooltips
```

**Native browser APIs used:** Server-Sent Events, Canvas 2D, Web Audio, Web Speech (recognition and synthesis), ResizeObserver, `matchMedia`, `window.print`.

## Notes and limits

- Voice input works in Chrome and Edge. Chrome's speech recognition uses an online service, so typed questions are the fallback on poor venue Wi-Fi. Spoken replies work offline.
- Browsers start audio only after the first click on the page.
- The lock screens are a UX demo, not access control; the routes are reachable directly.
- State is in memory; a single server instance serves both views.

## Team

Built in 24 hours for the NASA Space Apps Challenge. AstroSentinel: because the nearest hospital is 225 million kilometres away.
