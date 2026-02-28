import { defineCollection, z } from "astro:content";

const roleEnum = z.enum(["preot", "diacon", "strana", "citeti", "rubrica"]);

const fixed = defineCollection({
  type: "data",
  schema: z.object({
    id: z.string(),
    title: z.string(),
    lines: z.array(
      z.object({
        role: roleEnum,
        text: z.string(),
      })
    ),
  }),
});

const octoechos = defineCollection({
  type: "data",
  schema: z.object({
    glas: z.number(),
    stihiriDomneStragatAm: z.array(
      z.object({
        text: z.string(),
        glasIndicator: z.string().optional(),
      })
    ),
    stihiraStihoavna: z.array(
      z.object({
        text: z.string(),
      })
    ),
    tropar: z.object({
      text: z.string(),
    }),
  }),
});

const triodion = defineCollection({
  type: "data",
  schema: z.object({
    saptamana: z.number(),
    sundayName: z.string(),
    stihiriDomneStragatAm: z.array(
      z.object({
        text: z.string(),
        rubric: z.string().optional(),
      })
    ),
    stihiraStihoavna: z.array(
      z.object({
        text: z.string(),
      })
    ),
    slavaMarimiStihoavna: z
      .object({
        text: z.string(),
      })
      .optional(),
  }),
});

export const collections = { fixed, octoechos, triodion };
