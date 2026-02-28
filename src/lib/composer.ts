/**
 * composer.ts
 *
 * Assembles Great Vespers from content collections.
 * Every line is attributed to a role (preot, diacon, strana, citeti, rubrica).
 */

import { getEntry } from "astro:content";
import type { LiturgicalContext } from "./context";

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface ServiceLine {
  role: "preot" | "diacon" | "strana" | "citeti" | "rubrica";
  text: string;
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
const L = (role: R, text: string): ServiceLine => ({ role, text });

async function loadFixed(slug: string): Promise<ServiceLine[]> {
  const entry = await getEntry("fixed", slug);
  if (!entry) return [L("rubrica", `[lipsă: fixed/${slug}]`)];
  return entry.data.lines as ServiceLine[];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function composeVespers(
  context: LiturgicalContext,
): Promise<VespersService> {
  const { tone, lentWeek, sundayName } = context;

  const [psalm103, ecteniaMare, fericitBarbatul, luminaLina, acumSlobozeste, trisagion, octoih, triod] =
    await Promise.all([
      loadFixed("psalm103"),
      loadFixed("ectenia-mare"),
      loadFixed("fericit-barbatul"),
      loadFixed("lumina-lina"),
      loadFixed("acum-slobozeste"),
      loadFixed("trisagion"),
      getEntry("octoechos", `glas${tone}`),
      getEntry("triodion", `saptamana${lentWeek}`),
    ]);

  // --- Build Stihiri pe 10 ---
  const stihiriLines: ServiceLine[] = [
    L("rubrica", `Se cântă Doamne strigat-am pe glasul ${tone}. Se pun stihiri din Octoih și din Triod.`),
    L("strana", "Doamne, strigat-am către Tine, auzi-mă! Ia aminte la glasul rugăciunii mele, când strig către Tine. Auzi-mă, Doamne!"),
    L("strana", "Să se îndrepteze rugăciunea mea ca tămâia înaintea Ta; ridicarea mâinilor mele, jertfă de seară. Auzi-mă, Doamne!"),
  ];
  if (octoih) {
    stihiriLines.push(L("rubrica", `Stihirile Octoihului, glasul ${tone}:`));
    for (const s of octoih.data.stihiriDomneStragatAm) {
      stihiriLines.push(L("strana", s.text));
    }
  }
  if (triod) {
    stihiriLines.push(L("rubrica", `Stihirile Triodului, săptămâna ${lentWeek} (${sundayName}):`));
    for (const s of triod.data.stihiriDomneStragatAm) {
      stihiriLines.push(L("strana", s.text));
    }
  }
  stihiriLines.push(L("rubrica", "Slavă… Și acum… Dogmatica glasului:"));
  stihiriLines.push(L("strana", `[Dogmatica glasul ${tone} – de completat]`));

  // --- Build Stihoavna ---
  const stihoavnaLines: ServiceLine[] = [];
  if (octoih) {
    stihoavnaLines.push(L("rubrica", `Stihirile Stihoavnei din Octoih, glasul ${tone}:`));
    for (const s of octoih.data.stihiraStihoavna) {
      stihoavnaLines.push(L("strana", s.text));
    }
  }
  if (triod) {
    stihoavnaLines.push(L("rubrica", "Stihirile Stihoavnei din Triod:"));
    for (const s of triod.data.stihiraStihoavna) {
      stihoavnaLines.push(L("strana", s.text));
    }
    if (triod.data.slavaMarimiStihoavna) {
      stihoavnaLines.push(L("rubrica", "Slavă… Și acum…"));
      stihoavnaLines.push(L("strana", triod.data.slavaMarimiStihoavna.text));
    }
  }

  // --- Build Tropar ---
  const troparLines: ServiceLine[] = [];
  if (octoih) {
    troparLines.push(L("rubrica", `Troparul Învierii, glasul ${tone}:`));
    troparLines.push(L("strana", octoih.data.tropar.text));
  }
  troparLines.push(L("rubrica", "Slavă… Și acum… Al Născătoarei:"));
  troparLines.push(L("strana", `[Troparul Născătoarei, glasul ${tone} – de completat]`));

  // --- Assemble all sections ---
  const sections: ServiceSection[] = [
    {
      id: "inceput",
      title: "Începutul Vecerniei",
      lines: [
        L("rubrica", "Preotul, stând în fața Sfintei Mese, cu ușile împărătești și dvera închise, rostește binecuvântarea:"),
        L("preot", "Binecuvântat este Dumnezeul nostru, totdeauna, acum și pururea și în vecii vecilor."),
        L("strana", "Amin."),
        L("rubrica", "Preotul deschide dvera, ia cădelnița și începe să cădească. Citeţul zice:"),
        L("citeti", "Veniți să ne închinăm Împăratului nostru, Dumnezeu!"),
        L("citeti", "Veniți să ne închinăm și să cădem la Hristos, Împăratul nostru, Dumnezeu!"),
        L("citeti", "Veniți să ne închinăm și să cădem la Însuși Hristos, Împăratul și Dumnezeul nostru!"),
      ],
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
      lines: [
        L("rubrica", "După Catismă, preotul rostește Ectenia mică:"),
        L("preot", "Iară și iară, cu pace, Domnului să ne rugăm."),
        L("strana", "Doamne, miluiește."),
        L("preot", "Apără, mântuiește, miluiește și ne păzește pe noi, Dumnezeule, cu harul Tău."),
        L("strana", "Doamne, miluiește."),
        L("preot", "Pe Preasfânta, curata, preabinecuvântata, slăvita Stăpâna noastră, de Dumnezeu Născătoarea și pururea Fecioara Maria, cu toți sfinții pomenind-o, pe noi înșine și unii pe alții și toată viața noastră lui Hristos Dumnezeu să o dăm."),
        L("strana", "Ție, Doamne."),
        L("preot", "Că a Ta este stăpânirea și a Ta este împărăția și puterea și slava, a Tatălui și a Fiului și a Sfântului Duh, acum și pururea și în vecii vecilor."),
        L("strana", "Amin."),
      ],
    },
    {
      id: "doamne-strigat-am",
      title: "Doamne strigat-am – Stihirile pe 10",
      lines: stihiriLines,
    },
    {
      id: "vohod",
      title: "Vohodul (Ieșirea)",
      lines: [
        L("rubrica", "Se face Vohodul cu cădelnița. Preotul și diaconul ies pe ușa de miazănoapte și intră pe ușile împărătești."),
        L("preot", "Înțelepciune! Drepți!"),
        L("strana", "Lumină lină a sfintei slave a Tatălui ceresc, Celui fără de moarte, a Sfântului, Fericitului, Iisuse Hristoase, venind la apusul soarelui, văzând lumina cea de seară, lăudăm pe Tatăl, pe Fiul și pe Sfântul Duh, Dumnezeu."),
        L("strana", "Vrednic ești în toată vremea a fi lăudat de glasuri cuvioase, Fiul lui Dumnezeu, Cel ce dai viață, pentru aceasta lumea Te slăvește."),
      ],
    },
    {
      id: "prochimen",
      title: "Prochimenul",
      lines: [
        L("preot", "Să luăm aminte! Pace tuturor!"),
        L("strana", "Și duhului tău."),
        L("preot", "Înțelepciune! Să luăm aminte!"),
        L("rubrica", "Prochimenul de sâmbătă seara, glasul 6:"),
        L("strana", "Domnul a împărățit, întru podoabă S-a îmbrăcat."),
        L("citeti", "Stih: Îmbrăcatu-S-a Domnul întru putere și S-a încins."),
        L("strana", "Domnul a împărățit, întru podoabă S-a îmbrăcat."),
        L("citeti", "Stih: Pentru că a întărit lumea care nu se va clătina."),
        L("strana", "Domnul a împărățit, întru podoabă S-a îmbrăcat."),
        L("citeti", "Stih: Casei Tale se cuvine sfințenie, Doamne, întru lungime de zile."),
        L("strana", "Domnul a împărățit, întru podoabă S-a îmbrăcat."),
      ],
    },
    {
      id: "ectenia-intreita",
      title: "Ectenia cererilor stăruitoare",
      lines: [
        L("rubrica", "Diaconul (sau preotul) rostește Ectenia cererilor stăruitoare:"),
        L("preot", "Să zicem toți, din tot sufletul și din tot cugetul nostru să zicem."),
        L("strana", "Doamne, miluiește."),
        L("preot", "Doamne atotțiitorule, Dumnezeul părinților noștri, rugămu-ne Ție, auzi-ne și ne miluiește."),
        L("strana", "Doamne, miluiește."),
        L("preot", "Miluiește-ne pe noi, Dumnezeule, după mare mila Ta, rugămu-ne Ție, auzi-ne și ne miluiește."),
        L("strana", "Doamne, miluiește. Doamne, miluiește. Doamne, miluiește."),
        L("preot", "Încă ne rugăm pentru Preafericitul Părintele nostru (N), Patriarhul Bisericii Ortodoxe Române, și pentru Preasfințitul (Înaltpreasfințitul) Părintele nostru (N), (Arhi)Episcopul (eparhiei)."),
        L("strana", "Doamne, miluiește. Doamne, miluiește. Doamne, miluiește."),
        L("preot", "Încă ne rugăm pentru tot sufletul creștinesc, pentru conducătorii țării noastre, pentru mai-marii orașelor și satelor și pentru iubitoarea de Hristos oaste."),
        L("strana", "Doamne, miluiește. Doamne, miluiește. Doamne, miluiește."),
        L("preot", "Încă ne rugăm pentru frații noștri: preoți, ieromonahi, ierodiaconi și monahi și pentru toată frățimea noastră în Hristos."),
        L("strana", "Doamne, miluiește. Doamne, miluiește. Doamne, miluiește."),
        L("preot", "Încă ne rugăm pentru fericiții și pururea pomeniții ctitori ai sfântului locașului acestuia și pentru toți cei mai dinainte adormiți părinți și frați ai noștri, dreptslăvitori creștini, care odihnesc aici și pretutindeni."),
        L("strana", "Doamne, miluiește. Doamne, miluiește. Doamne, miluiește."),
        L("preot", "Încă ne rugăm pentru cei ce aduc daruri și fac bine în sfântă și preacinstita biserică aceasta, pentru cei ce se ostenesc, pentru cei ce cântă și pentru poporul care stă înainte și așteaptă de la Tine mare și bogată milă."),
        L("strana", "Doamne, miluiește. Doamne, miluiește. Doamne, miluiește."),
        L("rubrica", "Ecfonisul:"),
        L("preot", "Că milostiv și iubitor de oameni Dumnezeu ești și Ție slavă înălțăm, Tatălui și Fiului și Sfântului Duh, acum și pururea și în vecii vecilor."),
        L("strana", "Amin."),
      ],
    },
    {
      id: "invredniceste-ne",
      title: "Învredniceşte-ne, Doamne",
      lines: [
        L("rubrica", "Citeţul (sau strana) rostește:"),
        L("citeti", "Învredniceşte-ne, Doamne, în seara aceasta, fără de păcat să ne păzim noi."),
        L("citeti", "Binecuvântat ești, Doamne, Dumnezeul părinților noștri, și lăudat și preaslăvit este numele Tău în veci. Amin."),
        L("citeti", "Fie, Doamne, mila Ta spre noi, precum am nădăjduit întru Tine."),
        L("citeti", "Binecuvântat ești, Doamne, învață-ne pe noi îndreptările Tale."),
        L("citeti", "Binecuvântat ești, Stăpâne, înțelepțește-ne pe noi cu îndreptările Tale."),
        L("citeti", "Binecuvântat ești, Sfinte, luminează-ne pe noi cu îndreptările Tale."),
        L("citeti", "Doamne, mila Ta este în veac; lucrurile mâinilor Tale nu le trece cu vederea."),
        L("citeti", "Ție se cuvine laudă, Ție se cuvine cântare, Ție slavă se cuvine, Tatălui și Fiului și Sfântului Duh, acum și pururea și în vecii vecilor. Amin."),
      ],
    },
    {
      id: "ectenia-cererilor",
      title: "Ectenia cererilor",
      lines: [
        L("rubrica", "Diaconul (sau preotul) rostește Ectenia cererilor:"),
        L("preot", "Să plinim rugăciunea noastră cea de seară, Domnului."),
        L("strana", "Dă, Doamne."),
        L("preot", "Apără, mântuiește, miluiește și ne păzește pe noi, Dumnezeule, cu harul Tău."),
        L("strana", "Dă, Doamne."),
        L("preot", "Seara toată desăvârșită, sfântă, în pace și fără de păcat, la Domnul să cerem."),
        L("strana", "Dă, Doamne."),
        L("preot", "Înger de pace, credincios îndreptător, păzitor al sufletelor și al trupurilor noastre, la Domnul să cerem."),
        L("strana", "Dă, Doamne."),
        L("preot", "Milă și iertare de păcatele și de greșelile noastre, la Domnul să cerem."),
        L("strana", "Dă, Doamne."),
        L("preot", "Cele bune și de folos sufletelor noastre și pace lumii, la Domnul să cerem."),
        L("strana", "Dă, Doamne."),
        L("preot", "Cealaltă vreme a vieții noastre în pace și întru pocăință a o săvârși, la Domnul să cerem."),
        L("strana", "Dă, Doamne."),
        L("preot", "Sfârșit creștinesc vieții noastre, fără durere, neînfruntat, în pace, și răspuns bun la înfricoșătoarea judecată a lui Hristos, să cerem."),
        L("strana", "Dă, Doamne."),
        L("preot", "Pe Preasfânta, curata, preabinecuvântata, slăvita Stăpâna noastră, de Dumnezeu Născătoarea și pururea Fecioara Maria, cu toți sfinții pomenind-o, pe noi înșine și unii pe alții și toată viața noastră lui Hristos Dumnezeu să o dăm."),
        L("strana", "Ție, Doamne."),
        L("rubrica", "Ecfonisul:"),
        L("preot", "Că bun și iubitor de oameni Dumnezeu ești și Ție slavă înălțăm, Tatălui și Fiului și Sfântului Duh, acum și pururea și în vecii vecilor."),
        L("strana", "Amin."),
        L("preot", "Pace tuturor!"),
        L("strana", "Și duhului tău."),
        L("preot", "Capetele noastre Domnului să le plecăm."),
        L("strana", "Ție, Doamne."),
        L("rubrica", "Preotul citește în taină rugăciunea plecării capetelor, apoi rostește ecfonisul:"),
        L("preot", "Fie stăpânirea împărăției Tale binecuvântată și preaslăvită, a Tatălui și a Fiului și a Sfântului Duh, acum și pururea și în vecii vecilor."),
        L("strana", "Amin."),
      ],
    },
    {
      id: "stihoavna",
      title: "Stihoavna",
      lines: stihoavnaLines.length > 0
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
      lines: [
        L("rubrica", "Preotul face otpustul (apolisul):"),
        L("preot", "Slavă Ție, Hristoase Dumnezeule, nădejdea noastră, slavă Ție."),
        L("strana", "Slavă Tatălui și Fiului și Sfântului Duh, și acum și pururea și în vecii vecilor. Amin. Doamne, miluiește. Doamne, miluiește. Doamne, miluiește. Părinte, binecuvintează!"),
        L("preot", "Cel ce a înviat din morți, Hristos, Adevăratul Dumnezeul nostru, pentru rugăciunile Preacuratei Maicii Sale, ale Sfinților slăviților și întru tot lăudaților Apostoli, și ale tuturor Sfinților, să ne miluiască și să ne mântuiască pe noi, ca un bun și de oameni iubitor."),
        L("strana", "Amin. Pe marele Domn și Părintele nostru (N), Preasfințitul (Arhiepiscopul / Episcopul nostru) (N), și pe toți dreptslăvitorii creștini, Doamne, îi păzește întru mulți ani!"),
      ],
    },
  ];

  return { context, sections };
}
