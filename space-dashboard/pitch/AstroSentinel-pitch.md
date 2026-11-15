# AstroSentinel: pitch for 3 speakers

**Format:** about 4–5 minutes, three speakers, one story: **problem → evidence → cost → solution**.
The scripts are in English (for the judges). The notes in *italics* are for you, in Russian.
Every number below has a source in the last section. Numbers marked ⚠ need the caveat shown.

| Speaker | Part | Time |
|---|---|---|
| **Speaker 1** | Problem and evidence | ~1:30 |
| **Speaker 2** | Cost of the problem, then the bridge to the solution | ~1:15 |
| **Speaker 3** | Solution and live demo, closing | ~2:00 |

---

## Speaker 1: the problem and the evidence

> **Hook.** In January 2026, NASA did something it had never done in 25 years of the space station: it brought a crew home early for a medical reason. The reason NASA gave was simple. The medicine and the diagnostic tools on board were not enough.
>
> That crew was 400 kilometres from Earth, and a rescue capsule was available. Now imagine the same situation on the way to Mars.
>
> **The problem.** On a Mars mission there is no rescue and no quick answer from Earth:
> - A signal takes about **22 minutes each way**, so one question and one answer take **about 40 minutes** (up to 44).
> - When the Sun is between Earth and Mars, there is a **communication blackout of 2 to 3 weeks**. NASA says these blackouts are *inevitable* for a crewed mission.
> - A return trip takes **6 to 9 months**, so evacuation is not an option.
>
> **The evidence that the risk is real.**
> - NASA's own Integrated Medical Model estimates **at least a 1-in-90 chance of losing a crew member to medical causes alone** on a 730-day Mars mission. NASA's safety engineers compare this to the Space Shuttle's total risk at the end of that program, and they call 1-in-90 *an underestimate*.
> - **Radiation:** the Curiosity rover measured about **0.66 sievert** for the Mars round trip alone, and that is without any solar storm. That is roughly a **3–4% added risk of fatal cancer**.
> - **Vision:** a 2026 study found **81% of NASA astronauts** (52 of 64) had at least one sign of SANS, the eye and brain syndrome caused by microgravity.
> - **Genes:** in the NASA Twins Study, about **1,000 genes** changed their activity during a year in space.
>
> **And NASA agrees.** Its Earth-Independent Medical Operations programme exists because crews must decide *without* Earth. NASA's own concept describes a decision-support system for the crew medical officer.

*Заметки: после слова "Mars" сделайте паузу, это главный контраст. Цифру 1-in-90 говорите медленно. Если спросят про 81%: исследования считают по-разному, диапазон 37–81%, мы взяли самое широкое определение (⚠).*

---

## Speaker 2: the cost of the problem

> **Time.** Every medical question costs **40+ minutes** of waiting. A blackout can last **up to 3 weeks**. When Crew-11 came home, the mission ended **more than a month early** (January 15 instead of February 20), a spacewalk was cancelled, and the station ran with **three** people instead of four.
>
> **Money.** Nobody has an official price for a Mars mission. Independent estimates start around **$230 billion**. For comparison, NASA's Inspector General puts Artemis at **$93 billion** so far, and **$4.1 billion per flight**. Even a rough calculation shows the stake: **a 1-in-90 chance of losing a crew member on a mission worth $230 billion** is about **$2.6 billion of expected loss** per mission (⚠ our own back-of-envelope arithmetic, not a NASA figure).
> And that is only the money. It does not include four lives.
>
> **Resources.** Space is the one place where every kilogram, watt and cubic metre counts. The Orion capsule has **314 cubic feet** of living space; the ISS has **15,000**. NASA's own documents list *mass, power, volume and data* as hard limits for medical systems on Mars. And NASA itself said it **could not accurately report the true cost** of its countermeasures against these risks.
>
> **So the question is not "can we afford a health monitoring system?"** The question is whether we can afford a system that weighs something, needs power, and waits 22 minutes for Earth.

*Заметки: не говорите "$2.6 billion" как факт NASA, всегда добавляйте "our own rough estimate". Если спросят, откуда $230B: это независимая оценка SpaceNews 2015, официальной цифры нет (⚠).*

---

## Speaker 3: the solution

> **AstroSentinel is health monitoring software for astronauts, with no new hardware.**
> It uses the data that suits and medical systems already produce. It weighs **zero kilograms**, needs **no extra power**, and runs entirely **on board**, so it works when Earth cannot answer.
>
> **How it looks: through the astronaut's own eyes.**
> We designed the whole interface as a *first-person view from inside the spacesuit helmet*. An astronaut cannot hold a tablet in gloves, so the information is on the visor, in the line of sight:
> - Left: heartbeat, risk score, and the Notch, eye-pressure and blood-brain-barrier markers.
> - Right: life support (oxygen, CO₂, pressure, battery) and radiation dose.
> - Centre: alarms and the next action.
>
> **The assistant.** When a measurement goes above the astronaut's own normal range, the assistant tells them what it means and what to do. In our demo, a solar storm raises the radiation dose, the visor turns red, the siren sounds, and the assistant says: *shelter, repeat the eye-pressure check, notify the medical officer.*
> Every point of the risk score is traced to one biomarker, so the crew medical officer can *see why*. There is no black box.
>
> **Earth is still in the loop.** Health digests are stored on board and sent when the link allows. Mission Control sees them after the real light delay.
>
> **[LIVE DEMO, 45 seconds]** Open `/crew` → press **F** → move the mouse (the head turns) → press **☀ Solar event** → the alarm → press **2** to show why the score changed → press **Cut link** → Earth goes dark, the crew console keeps working.
>
> **Close.** *When Earth can't answer, the crew still can.*

*Заметки: перед демо запустите `npm run build` и `npm start`, откройте /crew на весь экран. Звук включится после первого клика.*

---

## Be ready for these judge questions

| Question | Honest answer |
|---|---|
| **Is the data real?** | The values are **synthetic**, calibrated to ranges from NASA open science (data.nasa.gov / OSDR). Real astronaut medical records are protected by privacy rules, so we model realistic ranges instead. The next step is validation with flight surgeons. |
| **Is the assistant AI?** | Today it is a **rule-based** assistant: it follows explainable thresholds and a checklist. We chose explainability over a black box on purpose. A language model is a possible later layer. |
| **"No hardware", really?** | We add no new devices. The software reads the telemetry the suit and medical systems already produce. Connecting to real flight systems is future work. |
| **Why not just talk to Houston?** | Because of the 22-minute delay and the weeks-long blackouts. Earth still gets the digests, but the first decision is made on board. |
| **Why first-person view?** | A gloved astronaut cannot use a tablet. A visor HUD keeps the information in the line of sight and the hands free. |
| **Is the 1-in-90 figure solid?** | It is a NASA Engineering & Safety Center presentation (COSPAR 2022) of the Integrated Medical Model, and NASA itself says it is an underestimate. It is not a peer-reviewed number. |

---

## NASA data on data.nasa.gov we used or can point to

| Dataset | What it is | Link |
|---|---|---|
| **Spaceflight Modulates Gene Expression in Astronauts** (OSD-53) | Blood from 6 astronauts before and after flight; 234 stress genes; DNA repair and oxidative stress genes changed | https://data.nasa.gov/dataset/spaceflight-modulates-gene-expression-in-astronauts-ba124 |
| **Advanced Radiation Protection project** | NASA's prototype for forecasting solar-event radiation risk and projecting dose | https://data.nasa.gov/dataset/advanced-radiation-protection-arp-advanced-radiation-protection-project |
| **MSL Mars Radiation Assessment Detector (RAD)** | Curiosity's measurements of the Mars radiation environment, the basis of the 0.66 Sv figure | https://data.nasa.gov/dataset/msl-mars-radiation-assessment-detector-rdr |
| **Low-dose ionizing radiation treated cells** | Human cells exposed to 1–10 cGy | https://data.nasa.gov/dataset/low-dose-ionizing-radiation-treated-lymphoblastoid-cells |
| **Salivary microbiome sequencing of astronauts** | How spaceflight changes the astronaut microbiome | https://data.nasa.gov/dataset/salivary-microbiome-sequencing-of-astronauts |
| **NASA OSDR** | Over 460 spaceflight biology studies | https://www.nasa.gov/osdr |

⚠ Individual astronaut records (LSAH) are **not public**. Say this openly: it is the reason our values are synthetic.

---

## Sources

**NASA and government**
- NASA Engineering & Safety Center, Valinia, *COSPAR 2022*: ≥1:90 loss of crew life for a 730-day Mars mission from medical risk alone, "an underestimate": https://ntrs.nasa.gov/api/citations/20220009899/downloads/F5.2_04_Valinia.pdf
- NASA, *Mars Communications Disruption and Delay* (2024): blackouts "inevitable and can last weeks"; 21–23 min one-way; ~13 days and ~3 weeks in example missions: https://www.nasa.gov/wp-content/uploads/2024/01/mars-communications-disruption-and-delay.pdf
- NASA Earth-Independent Medical Operations (EIMO) abstract, including a decision-support system and the six clinical scenario types: https://ntrs.nasa.gov/citations/20240011647
- NASA Inspector General IG-16-003 (2015): first deep-space crews may "accept a higher level of risk"; NASA could not report the true cost of countermeasures; Orion 314 vs ISS 15,000 cu ft; HRP spent $152.2M in FY2014: https://oig.nasa.gov/docs/IG-16-003.pdf
- NASA Inspector General on Artemis: $4.1 billion per flight: https://spacepolicyonline.com/news/first-four-artemis-flights-will-cost-4-1-billion-each-nasa-ig-tells-congress/

**News and journals**
- Crew-11 medical evacuation (SpacePolicyOnline): https://spacepolicyonline.com/news/crew-11-back-on-earth-so-ailing-crew-member-can-get-treatment/ · NPR: https://www.npr.org/2026/01/15/nx-s1-5677647/nasa-spacex-crew-11-splashdown-return
- Mars radiation, 0.66 Sv round trip (*Science*, 2013, coverage): https://www.space.com/21359-mars-radiation-manned-mission.html · https://www.sciencenews.org/article/mars-trip-would-deliver-big-radiation-dose ⚠ measured at low-to-moderate solar activity, no major storm.
- SANS: 81% in the 2026 *Eye* article: https://link.springer.com/10.1038/s41433-026-04651-6 · NASA consensus summary: https://theophthalmologist.com/issues/2026/articles/august/standardizing-sans-in-spaceflight/ ⚠ other studies report 37–60% with narrower definitions.
- NASA Twins Study, *Science* 2019 (STAT): https://www.statnews.com/2019/04/11/nasa-twins-study-scott-kelly-space-travel/ ⚠ two people only.
- Mars mission cost estimates (SpaceNews, 2015, ~$230B): https://spacenews.com/?p=43332 ⚠ independent estimate, NASA has no official figure.

**What I could not confirm**
- A single official NASA percentage for SANS.
- Current NASA deep-space radiation limits (the sources I found are from 2013 and disagree on the limit).
- Any official price of a Mars mission, or the cost of the Crew-11 early return.
