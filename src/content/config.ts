import { defineCollection, z } from "astro:content";

const roleEnum = z.enum(["preot", "diacon", "strana", "citeti", "rubrica"]);

const stihiraSchema = z.object({ text: z.string() });

const fixed = defineCollection({
  type: "data",
  schema: z.union([
    // Standard fixed texts (psalm103, ectenia-mare, etc.)
    z.object({
      id: z.string(),
      title: z.string(),
      lines: z.array(
        z.object({
          role: roleEnum,
          text: z.string(),
          redInitial: z.boolean().optional(),
          italic: z.boolean().optional(),
        })
      ),
    }),
    // Stihuri la Doamne strigat-am (versete de psalm, numerotate)
    z.object({
      id: z.string(),
      title: z.string(),
      stihuri: z.array(
        z.object({
          nr: z.number(),
          text: z.string(),
        })
      ),
    }),
  ]),
});

const octoechos = defineCollection({
  type: "data",
  schema: z.object({
    glas: z.number(),
    title: z.string(),
    stihiriInvierii: z.array(stihiraSchema),
    stihiriAnatolie: z.array(stihiraSchema),
    dogmatica: stihiraSchema,
    stihiraStihoavna: z.array(stihiraSchema),
    tropar: stihiraSchema,
    troparNascatoarei: stihiraSchema.optional(),
  }),
});

const sursaSchema = z.object({
  sursa: z.string(),
  grupa: z.string().optional(),
  count: z.number(),
  rubrica: z.string(),
});

const triodion = defineCollection({
  type: "data",
  schema: z.object({
    saptamana: z.number(),
    title: z.string(),
    sundayName: z.string(),
    randuiala: z.object({
      stihiriPe: z.number(),
      surse: z.array(sursaSchema),
    }),
    stihiriVecernie: z.array(stihiraSchema),
    slavaDoamneStrigatAm: z.object({
      glas: z.string(),
      text: z.string(),
    }).optional(),
    stihiraStihoavna: z.array(stihiraSchema),
    slavaSiAcumStihoavna: stihiraSchema.optional(),
    troparSfant: z.object({
      glas: z.string(),
      rubrica: z.string(),
      text: z.string(),
      glasNascatoarei: z.number(),
    }).optional(),
  }),
});

const presanctified = defineCollection({
  type: "data",
  schema: z.object({
    date: z.string(),
    dayOfWeek: z.enum(["miercuri", "vineri"]),
    lentWeek: z.number(),
    title: z.string(),
    tone: z.number(),
    stihiraZilei: z.object({ text: z.string(), glas: z.number().optional() }),
    stihiriMucenicilor: z.array(stihiraSchema),
    stihiriMinei: z.array(stihiraSchema),
    rubricaTriod: z.string().optional(),
    slavaMortilor: z.object({
      glas: z.string(),
      text: z.string(),
    }).optional(),
    nascatoarea: z.object({
      text: z.string(),
    }).optional(),
    prochimen1: z.object({
      glas: z.number(),
      text: z.string(),
      stih: z.string(),
    }),
    paremia1: z.object({
      sursa: z.string(),
      referinta: z.string(),
      text: z.string(),
    }),
    prochimen2: z.object({
      glas: z.number(),
      text: z.string(),
      stih: z.string(),
    }),
    paremia2: z.object({
      sursa: z.string(),
      referinta: z.string(),
      text: z.string(),
    }),
  }),
});

const minei = defineCollection({
  type: "data",
  schema: z.object({
    month: z.number(),
    day: z.number(),
    saint: z.string(),
    vecernie: z.object({
      glas: z.number(),
      podobia: z.string().nullable().optional(),
      stihiri: z.array(stihiraSchema),
      slava: z.object({ glas: z.number(), text: z.string() }).optional(),
      siAcum: z.object({ glas: z.number(), text: z.string() }).optional(),
      nascatoarea: stihiraSchema.optional(),
      cruciiNascatoarea: stihiraSchema.optional(),
      tropar: z.object({ glas: z.number(), text: z.string() }).optional(),
      troparNascatoarea: stihiraSchema.optional(),
    }).nullable(),
  }),
});

export const collections = { fixed, octoechos, triodion, presanctified, minei };
