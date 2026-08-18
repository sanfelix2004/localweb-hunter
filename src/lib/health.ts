// Algoritmo di "Bruttezza" — Website Health Score 0-100.
// Score BASSO = sito pessimo = lead PRIORITARIO.
// Un lead senza sito riceve score 0 e flag NO_WEBSITE.

import * as cheerio from "cheerio";

export type HealthFlag =
  | "NO_WEBSITE"
  | "SITE_UNREACHABLE"
  | "NO_SSL"
  | "NOT_MOBILE_FRIENDLY"
  | "SLOW_LOADING"
  | "VERY_SLOW_LOADING"
  | "DEPRECATED_TECH"
  | "TABLE_LAYOUT"
  | "OUTDATED_COPYRIGHT"
  | "OBSOLETE_GENERATOR"
  | "POOR_SEO_META"
  | "NO_MODERN_MARKUP"
  | "LOW_PAGESPEED";

export interface HealthDetail {
  finalUrl?: string;
  https: boolean;
  reachable: boolean;
  loadTimeMs?: number;
  hasViewport?: boolean;
  hasFlash?: boolean;
  hasFrameset?: boolean;
  tableLayout?: boolean;
  copyrightYear?: number;
  generator?: string;
  hasOgTags?: boolean;
  hasDescription?: boolean;
  html5Doctype?: boolean;
  pagespeedScore?: number; // 0-100 se PAGESPEED_API_KEY configurata
  httpStatus?: number;
}

export interface HealthResult {
  score: number; // 0-100
  flags: HealthFlag[];
  detail: HealthDetail;
  issuesHuman: string[]; // descrizioni in italiano, usate per il pitch AI
}

const FETCH_TIMEOUT_MS = 15000;
const UA_MOBILE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

export function noWebsiteResult(): HealthResult {
  return {
    score: 0,
    flags: ["NO_WEBSITE"],
    detail: { https: false, reachable: false },
    issuesHuman: [
      "l'attività non ha alcun sito web: è invisibile a chi cerca online",
    ],
  };
}

export async function analyzeWebsite(rawUrl: string): Promise<HealthResult> {
  const flags: HealthFlag[] = [];
  const issues: string[] = [];
  const detail: HealthDetail = { https: false, reachable: false };
  let score = 100;

  // 1. Tenta HTTPS prima, poi fallback HTTP
  const bareUrl = rawUrl.replace(/^https?:\/\//i, "");
  let html: string | null = null;

  for (const scheme of ["https://", "http://"]) {
    const url = scheme + bareUrl;
    try {
      const start = Date.now();
      const res = await fetch(url, {
        headers: { "User-Agent": UA_MOBILE, Accept: "text/html,*/*" },
        redirect: "follow",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      detail.loadTimeMs = Date.now() - start;
      detail.httpStatus = res.status;
      detail.finalUrl = res.url;
      if (!res.ok) continue;
      html = await res.text();
      detail.reachable = true;
      detail.https = res.url.startsWith("https://");
      break;
    } catch {
      // prova lo schema successivo
    }
  }

  if (!html) {
    return {
      score: 5,
      flags: ["SITE_UNREACHABLE"],
      detail,
      issuesHuman: [
        "il sito indicato risulta irraggiungibile o non funziona più",
      ],
    };
  }

  // 2. SSL
  if (!detail.https) {
    score -= 20;
    flags.push("NO_SSL");
    issues.push(
      'il sito non ha il certificato di sicurezza HTTPS: i browser lo mostrano come "Non sicuro"'
    );
  }

  // 3. Velocità (misura base; PageSpeed API se configurata)
  if (detail.loadTimeMs! > 6000) {
    score -= 15;
    flags.push("VERY_SLOW_LOADING");
    issues.push(`il sito è molto lento a caricare (${(detail.loadTimeMs! / 1000).toFixed(1)}s)`);
  } else if (detail.loadTimeMs! > 3000) {
    score -= 10;
    flags.push("SLOW_LOADING");
    issues.push(`il sito impiega ${(detail.loadTimeMs! / 1000).toFixed(1)} secondi a caricare`);
  }

  // 4. Analisi HTML
  const $ = cheerio.load(html);
  const htmlLower = html.toLowerCase();

  // Mobile-friendliness: meta viewport
  detail.hasViewport = $('meta[name="viewport"]').length > 0;
  if (!detail.hasViewport) {
    score -= 25;
    flags.push("NOT_MOBILE_FRIENDLY");
    issues.push(
      "il sito non è ottimizzato per smartphone: da mobile si vede in miniatura e va zoomato per leggerlo"
    );
  }

  // Doctype HTML5
  detail.html5Doctype = /^\s*<!doctype html>/i.test(html);

  // Tecnologie deprecate: Flash, applet, frameset, marquee
  detail.hasFlash =
    $('object[type*="flash"], embed[src$=".swf"], object[data$=".swf"]').length > 0 ||
    htmlLower.includes("shockwave-flash");
  detail.hasFrameset = $("frameset, frame").length > 0;
  const hasMarquee = $("marquee, blink").length > 0;
  if (detail.hasFlash || detail.hasFrameset || hasMarquee) {
    score -= 15;
    flags.push("DEPRECATED_TECH");
    issues.push(
      detail.hasFlash
        ? "usa Adobe Flash, tecnologia morta dal 2020: quei contenuti non si vedono più su nessun browser"
        : "usa tecnologie web abbandonate da oltre 15 anni (frame/marquee)"
    );
  }

  // Layout a tabelle (heuristica: molte tabelle annidate, niente markup semantico)
  const tableCount = $("table").length;
  const semanticCount = $("nav, main, section, article, header, footer").length;
  detail.tableLayout = tableCount >= 3 && semanticCount === 0;
  if (detail.tableLayout || !detail.html5Doctype) {
    score -= 10;
    flags.push(detail.tableLayout ? "TABLE_LAYOUT" : "NO_MODERN_MARKUP");
    issues.push("la struttura della pagina è costruita con tecniche di 20 anni fa");
  }

  // Generator obsoleto
  detail.generator = $('meta[name="generator"]').attr("content") ?? undefined;
  if (
    detail.generator &&
    /frontpage|dreamweaver|word|publisher|netobjects|geocities|joomla!? 1|wordpress [1-4]\./i.test(
      detail.generator
    )
  ) {
    score -= 10;
    flags.push("OBSOLETE_GENERATOR");
    issues.push(`il sito è stato creato con software obsoleto (${detail.generator})`);
  }

  // Copyright / ultimo aggiornamento
  const currentYear = new Date().getFullYear();
  const copyrightMatches = html.match(/(?:©|&copy;|copyright)\D{0,30}(\d{4})/gi);
  if (copyrightMatches) {
    const years = copyrightMatches
      .map((m) => parseInt(m.match(/(\d{4})/)![1], 10))
      .filter((y) => y >= 1995 && y <= currentYear);
    if (years.length) {
      detail.copyrightYear = Math.max(...years);
      if (detail.copyrightYear <= currentYear - 2) {
        score -= 10;
        flags.push("OUTDATED_COPYRIGHT");
        issues.push(
          `il copyright è fermo al ${detail.copyrightYear}: il sito sembra abbandonato da anni`
        );
      }
    }
  }

  // Meta moderni / SEO base
  detail.hasOgTags = $('meta[property^="og:"]').length > 0;
  detail.hasDescription = $('meta[name="description"]').length > 0;
  if (!detail.hasOgTags && !detail.hasDescription) {
    score -= 10;
    flags.push("POOR_SEO_META");
    issues.push(
      "mancano i meta tag di base: su Google e nelle condivisioni social il sito appare male o non appare"
    );
  }

  // 5. PageSpeed API (opzionale)
  const psKey = process.env.PAGESPEED_API_KEY;
  if (psKey && detail.finalUrl) {
    try {
      const psUrl =
        `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
        `?url=${encodeURIComponent(detail.finalUrl)}&strategy=mobile&category=performance&key=${psKey}`;
      const psRes = await fetch(psUrl, { signal: AbortSignal.timeout(60000) });
      if (psRes.ok) {
        const psData = await psRes.json();
        const perf = psData?.lighthouseResult?.categories?.performance?.score;
        if (typeof perf === "number") {
          detail.pagespeedScore = Math.round(perf * 100);
          if (detail.pagespeedScore < 50) {
            score -= 10;
            flags.push("LOW_PAGESPEED");
            issues.push(
              `Google PageSpeed assegna al sito un punteggio di ${detail.pagespeedScore}/100 su mobile`
            );
          }
        }
      }
    } catch {
      // PageSpeed è best-effort: non blocca l'analisi
    }
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    flags,
    detail,
    issuesHuman: issues,
  };
}

/** Etichette italiane per la UI. */
export const FLAG_LABELS: Record<HealthFlag, string> = {
  NO_WEBSITE: "Nessun sito",
  SITE_UNREACHABLE: "Sito irraggiungibile",
  NO_SSL: "No HTTPS",
  NOT_MOBILE_FRIENDLY: "Non mobile-friendly",
  SLOW_LOADING: "Lento",
  VERY_SLOW_LOADING: "Molto lento",
  DEPRECATED_TECH: "Tecnologie deprecate",
  TABLE_LAYOUT: "Layout a tabelle",
  OUTDATED_COPYRIGHT: "Copyright vecchio",
  OBSOLETE_GENERATOR: "Software obsoleto",
  POOR_SEO_META: "SEO carente",
  NO_MODERN_MARKUP: "Markup datato",
  LOW_PAGESPEED: "PageSpeed basso",
};
