/**
 * composer.ts
 *
 * Assembles Great Vespers from content collections.
 * Every line is attributed to a role (preot, diacon, strana, citeti, rubrica).
 *
 * Architecture:
 * - Fixed texts (psalms, ectenias) are loaded from the "fixed" collection
 * - Stihuri (psalm verses at Doamne strigat-am) are in a separate fixed file
 * - Stihiri (hymns) come from Octoechos and Triodion collections
 * - The Triodion's "randuiala" field determines how stihuri and stihiri
 *   are interleaved (pe 10, pe 8, pe 6)
 */

import { getEntry } from "astro:content";
import type { LiturgicalContext } from "./context";

// ---------------------------------------------------------------------------
// Public interfaces
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

export interface VespersService {
  context: LiturgicalContext;
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
// Build the Stihuri + Stihiri section (Doamne strigat-am)
// ---------------------------------------------------------------------------

interface Sursa {
  sursa: string;
  grupa?: string;
  count: number;
  rubrica: string;
}

function buildStihiriSection(
  stihuri: Stih[],
  randuiala: { stihiriPe: number; surse: Sursa[] },
  octoihData: {
    stihiriInvierii: { text: string }[];
    stihiriAnatolie: { text: string }[];
  } | null,
  triodStihiri: { text: string }[],
  tone: number,
): ServiceLine[] {
  const lines: ServiceLine[] = [];
  const pe = randuiala.stihiriPe;

  // Filter stihuri to only those we need (pe 10 = all, pe 8 = 8→1, etc.)
  const activeStihuri = stihuri.filter((s) => s.nr <= pe);

  // Build ordered list of all stihiri with their rubrics
  interface StihiraEntry {
    text: string;
    rubricBefore?: string; // rubric to show before this group starts
  }

  const allEntries: StihiraEntry[] = [];

  for (const sursa of randuiala.surse) {
    let stihiriTexts: { text: string }[] = [];

    if (sursa.sursa === "octoih" && octoihData) {
      if (sursa.grupa === "invierii") {
        stihiriTexts = octoihData.stihiriInvierii.slice(0, sursa.count);
      } else if (sursa.grupa === "anatolie") {
        stihiriTexts = octoihData.stihiriAnatolie.slice(0, sursa.count);
      }
    } else if (sursa.sursa === "triod") {
      stihiriTexts = triodStihiri.slice(0, sursa.count);
    }

    for (let i = 0; i < stihiriTexts.length; i++) {
      allEntries.push({
        text: stihiriTexts[i].text,
        rubricBefore: i === 0 ? sursa.rubrica : undefined,
      });
    }
  }

  // Pair stihuri with stihiri
  // activeStihuri is sorted 10→1 (descending), allEntries is in order
  for (let i = 0; i < activeStihuri.length && i < allEntries.length; i++) {
    const entry = allEntries[i];
    const stih = activeStihuri[i];

    // Rubric before new group
    if (entry.rubricBefore) {
      const rubricText = entry.rubricBefore.replace(
        "glasul de rând",
        `glasul ${tone}`,
      );
      lines.push(L("rubrica", rubricText));
    }

    // Stih (psalm verse) — displayed as rubric (red)
    lines.push(L("rubrica", `Stih: ${stih.text}`));

    // Stihira (hymn) — sung by strana, with red initial
    lines.push(L("strana", entry.text, true));
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function composeVespers(
  context: LiturgicalContext,
): Promise<VespersService> {
  const { tone, lentWeek, sundayName } = context;

  const [
    inceput,
    psalm103,
    ecteniaMare,
    fericitBarbatul,
    ecteniaMica,
    doamneStrigatAm,
    stihuri,
    stihiriStihoavnaStihuri,
    vohod,
    prochimen,
    ecteniaIntreita,
    invredniceste,
    ecteniaCererilor,
    acumSlobozeste,
    trisagion,
    otpust,
    octoih,
    triod,
  ] = await Promise.all([
    loadFixed("inceput"),
    loadFixed("psalm103"),
    loadFixed("ectenia-mare"),
    loadFixed("fericit-barbatul"),
    loadFixed("ectenia-mica"),
    loadFixed("doamne-strigat-am"),
    loadStihuri("stihuri-la-doamne-strigat-am"),
    loadStihuri("stihuri-stihoavna"),
    loadFixed("vohod"),
    loadFixed("prochimen"),
    loadFixed("ectenia-intreita"),
    loadFixed("invredniceste-ne"),
    loadFixed("ectenia-cererilor"),
    loadFixed("acum-slobozeste"),
    loadFixed("trisagion"),
    loadFixed("otpust"),
    getEntry("octoechos", `glas${tone}`),
    getEntry("triodion", `saptamana${lentWeek}`),
  ]);

  // --- Psalmii 140+141 (Doamne strigat-am) ---
  const psalmiiLines: ServiceLine[] = [...doamneStrigatAm];

  // --- Stihirile (intercalate cu stihuri) ---
  const stihiriLines: ServiceLine[] = [
    L("rubrica", "Și îndată se cântă:"),
  ];

  if (triod && octoih) {
    const assembled = buildStihiriSection(
      stihuri,
      triod.data.randuiala,
      octoih.data,
      triod.data.stihiriVecernie,
      tone,
    );
    stihiriLines.push(...assembled);
  } else if (octoih) {
    // Fallback: no triod, just octoih
    const defaultRanduiala = {
      stihiriPe: 8 as number,
      surse: [
        {
          sursa: "octoih",
          grupa: "invierii",
          count: 3,
          rubrica: "Stihirile Învierii, glasul de rând:",
        },
        {
          sursa: "octoih",
          grupa: "anatolie",
          count: 4,
          rubrica: "Alte stihiri, ale lui Anatolie:",
        },
      ],
    };
    const assembled = buildStihiriSection(
      stihuri,
      defaultRanduiala,
      octoih.data,
      [],
      tone,
    );
    stihiriLines.push(...assembled);
  }

  // Slavă (from Triod) + Și acum + Dogmatica
  if (triod?.data.slavaDoamneStrigatAm) {
    stihiriLines.push(
      L("rubrica", `Slavă..., glasul ${triod.data.slavaDoamneStrigatAm.glas}:`),
    );
    stihiriLines.push(L("strana", triod.data.slavaDoamneStrigatAm.text, true));
    stihiriLines.push(L("rubrica", "Și acum..., a Născătoarei de Dumnezeu:"));
    stihiriLines.push(L("rubrica", `Dogmatica glasului ${tone}:`));
  } else {
    stihiriLines.push(
      L(
        "strana",
        "Slavă Tatălui și Fiului și Sfântului Duh, și acum și pururea și în vecii vecilor. Amin.",
      ),
    );
    stihiriLines.push(L("rubrica", `Dogmatica glasului ${tone}:`));
  }
  if (octoih) {
    stihiriLines.push(L("strana", octoih.data.dogmatica.text, true));
  } else {
    stihiriLines.push(
      L("strana", `[Dogmatica glasul ${tone} – de completat]`),
    );
  }

  // --- Build Stihoavna ---
  // Liturgical pattern: first stihira alone, then stih+stihira pairs
  // Stihuri from Psalm 92, stihiri from Octoih (4 total)
  const stihoavnaLines: ServiceLine[] = [];
  if (octoih) {
    const stihiraStihoavna = octoih.data.stihiraStihoavna;
    stihoavnaLines.push(
      L("rubrica", `Stihirile Stihoavnei, glasul ${tone}:`),
    );
    for (let i = 0; i < stihiraStihoavna.length; i++) {
      // First stihira has no stih before it; subsequent ones get a stih
      if (i > 0 && i - 1 < stihiriStihoavnaStihuri.length) {
        stihoavnaLines.push(
          L("rubrica", `Stih: ${stihiriStihoavnaStihuri[i - 1].text}`),
        );
      }
      stihoavnaLines.push(L("strana", stihiraStihoavna[i].text, true));
    }
  }
  if (triod) {
    if (triod.data.stihiraStihoavna.length > 0) {
      // Slavă text at Stihoavna (from Triod/Minei)
      stihoavnaLines.push(L("rubrica", "Slavă...:"));
      for (const s of triod.data.stihiraStihoavna) {
        stihoavnaLines.push(L("strana", s.text, true));
      }
      // Și acum, a Născătoarei
      if (triod.data.slavaSiAcumStihoavna) {
        stihoavnaLines.push(L("rubrica", "Și acum..., a Născătoarei:"));
        stihoavnaLines.push(L("strana", triod.data.slavaSiAcumStihoavna.text, true));
      }
    } else if (triod.data.slavaSiAcumStihoavna) {
      // Combined Slavă..., Și acum... (e.g. D3 Crucea)
      stihoavnaLines.push(L("rubrica", "Slavă..., Și acum...:"));
      stihoavnaLines.push(L("strana", triod.data.slavaSiAcumStihoavna.text, true));
    }
  }

  // --- Build Tropar ---
  // Pattern: Troparul Învierii → Slavă..., al Sfântului → Și acum..., a Născătoarei
  // Născătoarei follows the glas of the saint's tropar, not the glas de rând
  const troparLines: ServiceLine[] = [];
  if (octoih) {
    troparLines.push(L("rubrica", `Troparul Învierii, glasul ${tone}:`));
    troparLines.push(L("strana", octoih.data.tropar.text, true));
  }

  if (triod?.data.troparSfant) {
    const ts = triod.data.troparSfant;
    troparLines.push(
      L("rubrica", `Slavă..., glasul ${ts.glas}. ${ts.rubrica}`),
    );
    troparLines.push(L("strana", ts.text, true));
    // Născătoarei on the glas of the saint's tropar
    const nascGlas = ts.glasNascatoarei;
    const nascOctoih = await getEntry("octoechos", `glas${nascGlas}`);
    troparLines.push(L("rubrica", "Și acum..., a Născătoarei de Dumnezeu:"));
    if (nascOctoih?.data.troparNascatoarei) {
      troparLines.push(L("strana", nascOctoih.data.troparNascatoarei.text, true));
    } else {
      troparLines.push(
        L("strana", `[Troparul Născătoarei, glasul ${nascGlas} – de completat]`),
      );
    }
  } else {
    troparLines.push(
      L(
        "strana",
        "Slavă Tatălui și Fiului și Sfântului Duh, și acum și pururea și în vecii vecilor. Amin.",
      ),
    );
    troparLines.push(L("rubrica", "Al Născătoarei de Dumnezeu:"));
    if (octoih?.data.troparNascatoarei) {
      troparLines.push(L("strana", octoih.data.troparNascatoarei.text, true));
    } else {
      troparLines.push(
        L("strana", `[Troparul Născătoarei, glasul ${tone} – de completat]`),
      );
    }
  }

  // --- Assemble all sections ---
  const sections: ServiceSection[] = [
    {
      id: "inceput",
      title: "Începutul Vecerniei",
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
      id: "fericit-barbatul",
      title: "Fericit Bărbatul (Catisma I)",
      lines: fericitBarbatul,
    },
    {
      id: "ectenia-mica-1",
      title: "Ectenia mică",
      lines: ecteniaMica,
    },
    {
      id: "doamne-strigat-am",
      title: "Doamne strigat-am (Ps. 140, 141)",
      lines: psalmiiLines,
    },
    {
      id: "stihiri",
      title: `Stihirile pe ${triod?.data.randuiala.stihiriPe ?? 10}`,
      lines: stihiriLines,
    },
    {
      id: "vohod",
      title: "Vohodul (Ieșirea)",
      lines: vohod,
    },
    {
      id: "prochimen",
      title: "Prochimenul",
      lines: prochimen,
    },
    {
      id: "ectenia-intreita",
      title: "Ectenia cererilor stăruitoare",
      lines: ecteniaIntreita,
    },
    {
      id: "invredniceste-ne",
      title: "Învredniceşte-ne, Doamne",
      lines: invredniceste,
    },
    {
      id: "ectenia-cererilor",
      title: "Ectenia cererilor",
      lines: ecteniaCererilor,
    },
    {
      id: "stihoavna",
      title: "Stihoavna",
      lines:
        stihoavnaLines.length > 0
          ? stihoavnaLines
          : [L("rubrica", "[Stihoavna – de completat]")],
    },
    {
      id: "acum-slobozeste",
      title: "Acum slobozește",
      lines: acumSlobozeste,
    },
    {
      id: "trisagion",
      title: "Sfinte Dumnezeule (Trisaghionul)",
      lines: trisagion,
    },
    {
      id: "tropar",
      title: "Troparul",
      lines: troparLines,
    },
    {
      id: "otpust",
      title: "Otpustul",
      lines: otpust,
    },
  ];

  return { context, sections };
}
