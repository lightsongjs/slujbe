/**
 * composer-presanctified.ts
 *
 * Assembles the Liturgy of the Presanctified Gifts from content collections.
 * Follows the same pattern as composer.ts (Vespers).
 *
 * Structure (from Liturghia Darurilor.pdf):
 * 1. Începutul (reused)
 * 2. Psalmul 103 (reused)
 * 3. Ectenia Mare (reused)
 * 4. Catisma 18 — Starea 1 + Ectenia mică
 * 5. Catisma 18 — Starea 2 + Ectenia mică
 * 6. Catisma 18 — Starea 3 + Ectenia mică
 * 7. Doamne strigat-am + Stihiri pe 10
 * 8. Vohod (Lumină lină)
 * 9. Prochimen 1
 * 10. Paremia 1 (Facere)
 * 11. Prochimen 2
 * 12. Paremia 2 (Pilde)
 * 13. Să se îndrepteze
 * 14. Ectenia întreită (reused)
 * 15. Ectenia catehumenilor
 * 16. (Ectenia luminării — din săpt. 4)
 * 17. Heruvicul: Acum Puterile cerești
 * 18. Ectenia cererilor (varianta Liturghiei)
 * 19. Tatăl nostru
 * 20. Împărtășirea
 * 21. După Împărtășire
 * 22. Otpustul
 */

import { getEntry } from "astro:content";
import type { PresanctifiedContext } from "./context";

// ---------------------------------------------------------------------------
// Reuse types from composer.ts
// ---------------------------------------------------------------------------

export interface ServiceLine {
  role: "preot" | "diacon" | "strana" | "citeti" | "rubrica";
  text: string;
  redInitial?: boolean;
  italic?: boolean;
}

export interface ServiceSection {
  id: string;
  title: string;
  lines: ServiceLine[];
}

export interface PresanctifiedService {
  context: PresanctifiedContext;
  sections: ServiceSection[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type R = ServiceLine["role"];
const L = (
  role: R,
  text: string,
  redInitial?: boolean,
  italic?: boolean,
): ServiceLine => {
  const line: ServiceLine = { role, text };
  if (redInitial) line.redInitial = true;
  if (italic) line.italic = true;
  return line;
};

async function loadFixed(slug: string): Promise<ServiceLine[]> {
  const entry = await getEntry("fixed", slug);
  if (!entry) return [L("rubrica", `[lipsă: fixed/${slug}]`)];
  if ("lines" in entry.data) return entry.data.lines as ServiceLine[];
  return [L("rubrica", `[format necunoscut: fixed/${slug}]`)];
}

interface Stih {
  nr: number;
  text: string;
}

async function loadStihuri(slug: string): Promise<Stih[]> {
  const entry = await getEntry("fixed", slug);
  if (!entry || !("stihuri" in entry.data)) return [];
  return entry.data.stihuri as Stih[];
}


// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function composePresanctified(
  context: PresanctifiedContext,
): Promise<PresanctifiedService> {
  const { tone, slug } = context;

  // Load everything in parallel
  const [
    inceput,
    psalm103,
    ecteniaMare,
    catisma18starea1,
    catisma18ectenie1,
    catisma18starea2,
    catisma18ectenie2,
    catisma18starea3,
    catisma18ectenie3,
    doamneStrigatAm,
    stihuri,
    saSeIndrepteze,
    ecteniaIntreita,
    ecteniaCatehumenilor,
    ecteniaCred1,
    ecteniaCred2,
    heruvicDaruri,
    ecteniaCererileDaruri,
    tatalNostruDaruri,
    impartasirea,
    dupaImpartasire,
    ,
    otpustDaruri,
    presanctData,
    octoih,
  ] = await Promise.all([
    loadFixed("inceput"),
    loadFixed("psalm103"),
    loadFixed("ectenia-mare"),
    loadFixed("catisma18-starea1"),
    loadFixed("catisma18-ectenie1"),
    loadFixed("catisma18-starea2"),
    loadFixed("catisma18-ectenie2"),
    loadFixed("catisma18-starea3"),
    loadFixed("catisma18-ectenie3"),
    loadFixed("doamne-strigat-am"),
    loadStihuri("stihuri-la-doamne-strigat-am"),
    loadFixed("sa-se-indrepteze"),
    loadFixed("ectenia-intreita"),
    loadFixed("ectenia-catehumenilor"),
    loadFixed("ectenia-credinciosilor-1"),
    loadFixed("ectenia-credinciosilor-2"),
    loadFixed("heruvic-daruri"),
    loadFixed("ectenia-cererilor-daruri"),
    loadFixed("tatal-nostru-daruri"),
    loadFixed("impartasirea"),
    loadFixed("dupa-impartasire"),
    loadFixed("psalm33"),
    loadFixed("otpust-daruri"),
    getEntry("presanctified", slug),
    getEntry("octoechos", `glas${tone}`),
  ]);

  const data = presanctData?.data;

  // --- Psalmii 140+141 (Doamne strigat-am) ---
  const psalmiiLines: ServiceLine[] = [...doamneStrigatAm];

  // --- Stihirile pe 10 (intercalate cu stihuri) ---
  const stihiriLines: ServiceLine[] = [
    L("rubrica", "Și îndată se cântă stihirile pe 10:"),
  ];

  if (data) {
    // activeStihuri: all 10 stihuri
    const activeStihuri = stihuri.filter((s) => s.nr <= 10);

    // Build ordered list of stihiri:
    // samoglasnica (×2) + 1 martirică + 3 podobnice Triod + 4 Minei = 10
    const allStihiri: { text: string; rubricBefore?: string }[] = [];

    // 1. Samoglasnica zilei (×2)
    allStihiri.push({
      text: data.stihiraZilei.text,
      rubricBefore: `Stihira zilei, glasul ${data.stihiraZilei.glas || data.tone}, singur glasul:`,
    });
    allStihiri.push({ text: data.stihiraZilei.text });

    // 2. Martirica (1)
    if (data.stihiriMucenicilor.length > 0) {
      allStihiri.push({
        text: data.stihiriMucenicilor[0].text,
        rubricBefore: `Martirica, glasul ${data.tone}:`,
      });
    }

    // 3. Podobnice din Triod (3)
    for (let i = 1; i < data.stihiriMucenicilor.length && i <= 3; i++) {
      allStihiri.push({
        text: data.stihiriMucenicilor[i].text,
        rubricBefore: i === 1 ? "Podobnice ale Triodului:" : undefined,
      });
    }

    // 4. Stihiri din Minei (4)
    for (let i = 0; i < data.stihiriMinei.length; i++) {
      allStihiri.push({
        text: data.stihiriMinei[i].text,
        rubricBefore: i === 0 ? "Din Minei:" : undefined,
      });
    }

    // Interleave stihuri with stihiri
    for (let i = 0; i < activeStihuri.length && i < allStihiri.length; i++) {
      const entry = allStihiri[i];
      const stih = activeStihuri[i];

      if (entry.rubricBefore) {
        stihiriLines.push(L("rubrica", entry.rubricBefore));
      }

      stihiriLines.push(L("rubrica", `Stih: ${stih.text}`));
      stihiriLines.push(L("strana", entry.text, true));
    }

    // Slavă..., Și acum..., a Născătoarei
    if (data.nascatoarea) {
      // Născătoarea din Minei (conform Anuarului)
      stihiriLines.push(L("rubrica", "Slavă..., Și acum..., a Născătoarei, din Minei:"));
      stihiriLines.push(L("strana", data.nascatoarea.text, true));
    } else if (data.slavaMortilor) {
      // Slavă morților + Dogmatica glasului de rând
      stihiriLines.push(
        L("rubrica", `Slavă..., a morților, glasul ${data.slavaMortilor.glas}:`),
      );
      stihiriLines.push(L("strana", data.slavaMortilor.text, true));
      stihiriLines.push(L("rubrica", "Și acum..., a Născătoarei de Dumnezeu:"));
      stihiriLines.push(L("rubrica", `Dogmatica glasului ${tone}:`));
      if (octoih) {
        stihiriLines.push(L("strana", octoih.data.dogmatica.text, true));
      } else {
        stihiriLines.push(
          L("strana", `[Dogmatica glasul ${tone} – de completat]`),
        );
      }
    }
  }

  // --- Vohod (just Lumină lină, no Vrednic ești at Presanctified) ---
  const vohodLines: ServiceLine[] = [
    L("rubrica", "Vohodul (cu cădelnița, fără Evanghelie):"),
    L("preot", "Înțelepciune, drepți!"),
    L("rubrica", "Strana cântă:"),
    L(
      "strana",
      "Lumină lină a sfintei slave a Tatălui ceresc, Celui fără de moarte, a Celui Sfânt și Fericit, Iisuse Hristoase, venind la apusul soarelui, văzând lumina cea de seară, lăudăm pe Tatăl, pe Fiul și pe Sfântul Duh, Dumnezeu. Vrednic ești în toată vremea a fi lăudat de glasuri cuvioase, Fiul lui Dumnezeu, Cel ce dai viață, pentru aceasta lumea Te slăvește.",
      true,
    ),
  ];

  // --- Prochimenele și paremiile ---
  const prochimen1Lines: ServiceLine[] = [];
  const paremia1Lines: ServiceLine[] = [];
  const prochimen2Lines: ServiceLine[] = [];
  const paremia2Lines: ServiceLine[] = [];

  if (data) {
    // Prochimen 1
    prochimen1Lines.push(L("preot", "Să luăm aminte. Pace tuturor."));
    prochimen1Lines.push(L("strana", "Și duhului tău."));
    prochimen1Lines.push(L("preot", "Înțelepciune. Să luăm aminte."));
    prochimen1Lines.push(
      L(
        "rubrica",
        `Prochimenul, glasul ${data.prochimen1.glas}:`,
      ),
    );
    prochimen1Lines.push(L("strana", data.prochimen1.text, true));
    prochimen1Lines.push(L("rubrica", `Stih: ${data.prochimen1.stih}`));
    prochimen1Lines.push(L("strana", `${data.prochimen1.text} (de 2 ori)`));

    // Paremia 1
    paremia1Lines.push(L("preot", "Înțelepciune!"));
    paremia1Lines.push(
      L(
        "citeti",
        `De la ${data.paremia1.sursa}, citire! (${data.paremia1.referinta})`,
      ),
    );
    paremia1Lines.push(L("preot", "Să luăm aminte!"));
    paremia1Lines.push(L("citeti", data.paremia1.text, false, true));

    // Prochimen 2
    prochimen2Lines.push(L("preot", "Înțelepciune. Să luăm aminte."));
    prochimen2Lines.push(
      L(
        "rubrica",
        `Prochimenul, glasul ${data.prochimen2.glas}:`,
      ),
    );
    prochimen2Lines.push(L("strana", data.prochimen2.text, true));
    prochimen2Lines.push(L("rubrica", `Stih: ${data.prochimen2.stih}`));
    prochimen2Lines.push(L("strana", `${data.prochimen2.text} (de 2 ori)`));

    // Paremia 2
    paremia2Lines.push(L("strana", "Porunciți!"));
    paremia2Lines.push(
      L(
        "rubrica",
        "Preotul, făcând cruce cu sfeșnicul și cădelnița, din fața Sfintelor Uși, întâi spre răsărit, apoi spre apus, zice:",
      ),
    );
    paremia2Lines.push(
      L("preot", "Înțelepciune, drepți! Lumina lui Hristos luminează tuturor!"),
    );
    paremia2Lines.push(
      L(
        "citeti",
        `De la ${data.paremia2.sursa}, citire! (${data.paremia2.referinta})`,
      ),
    );
    paremia2Lines.push(L("preot", "Să luăm aminte!"));
    paremia2Lines.push(L("citeti", data.paremia2.text, false, true));
  }

  // --- Assemble all sections ---
  const sections: ServiceSection[] = [
    {
      id: "inceput",
      title: "Începutul",
      lines: inceput,
    },
    {
      id: "psalm-103",
      title: "Psalmul 103 (Psalmul de început)",
      lines: psalm103,
    },
    {
      id: "ectenia-mare",
      title: "Ectenia Mare",
      lines: ecteniaMare,
    },
    {
      id: "catisma18-starea1",
      title: "Catisma 18 — Starea 1 (Ps. 119–123)",
      lines: catisma18starea1,
    },
    {
      id: "catisma18-ectenie1",
      title: "Ectenia mică (după Starea 1)",
      lines: catisma18ectenie1,
    },
    {
      id: "catisma18-starea2",
      title: "Catisma 18 — Starea 2 (Ps. 124–128)",
      lines: catisma18starea2,
    },
    {
      id: "catisma18-ectenie2",
      title: "Ectenia mică (după Starea 2)",
      lines: catisma18ectenie2,
    },
    {
      id: "catisma18-starea3",
      title: "Catisma 18 — Starea 3 (Ps. 129–133)",
      lines: catisma18starea3,
    },
    {
      id: "catisma18-ectenie3",
      title: "Ectenia mică (după Starea 3)",
      lines: catisma18ectenie3,
    },
    {
      id: "doamne-strigat-am",
      title: "Doamne strigat-am (Ps. 140, 141)",
      lines: psalmiiLines,
    },
    {
      id: "stihiri",
      title: "Stihirile pe 10",
      lines: stihiriLines,
    },
    {
      id: "vohod",
      title: "Vohodul (Ieșirea)",
      lines: vohodLines,
    },
    {
      id: "prochimen-1",
      title: "Prochimenul 1",
      lines: prochimen1Lines,
    },
    {
      id: "paremia-1",
      title: "Paremia 1 (Facere)",
      lines: paremia1Lines,
    },
    {
      id: "prochimen-2",
      title: "Prochimenul 2",
      lines: prochimen2Lines,
    },
    {
      id: "paremia-2",
      title: "Paremia 2 (Pilde)",
      lines: paremia2Lines,
    },
    {
      id: "sa-se-indrepteze",
      title: "Să se îndrepteze rugăciunea mea",
      lines: saSeIndrepteze,
    },
    {
      id: "ectenia-intreita",
      title: "Ectenia cererilor stăruitoare",
      lines: ecteniaIntreita,
    },
    {
      id: "ectenia-catehumenilor",
      title: "Ectenia catehumenilor",
      lines: ecteniaCatehumenilor,
    },
  ];

  // Cele două ectenii mici ale credincioșilor
  sections.push(
    {
      id: "ectenia-credinciosilor-1",
      title: "Ectenia mică (I) a credincioșilor",
      lines: ecteniaCred1,
    },
    {
      id: "ectenia-credinciosilor-2",
      title: "Ectenia mică (II) a credincioșilor",
      lines: ecteniaCred2,
    },
    {
      id: "heruvic-daruri",
      title: "Heruvic: Acum Puterile cerești",
      lines: heruvicDaruri,
    },
    {
      id: "ectenia-cererilor-daruri",
      title: "Ectenia cererilor",
      lines: ecteniaCererileDaruri,
    },
    {
      id: "tatal-nostru",
      title: "Tatăl nostru",
      lines: tatalNostruDaruri,
    },
    {
      id: "impartasirea",
      title: "Împărtășirea",
      lines: impartasirea,
    },
    {
      id: "dupa-impartasire",
      title: "După Împărtășire",
      lines: dupaImpartasire,
    },
    {
      id: "otpust",
      title: "Otpustul",
      lines: otpustDaruri,
    },
  );

  return { context, sections };
}
