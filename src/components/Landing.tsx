import Link from "next/link";
import { Brand } from "@/components/Brand";
import RadarHero from "@/components/RadarHero";
import { Icons } from "@/components/Icons";

const STEPS = [
  {
    n: "01",
    title: "Scansiona il territorio",
    body: "Inserisci città, CAP o coordinate. Overpass e Nominatim trovano le attività reali della categoria nel raggio che scegli.",
  },
  {
    n: "02",
    title: "Qualifica in automatico",
    body: "Ogni sito riceve un Health Score 0–100. Senza sito, HTTP, non mobile, lento o datato: il lead sale in cima alla lista.",
  },
  {
    n: "03",
    title: "Contatta in un click",
    body: "Pitch email e WhatsApp già personalizzati sui problemi rilevati. Modifichi, invii, segni il lead come contattato.",
  },
];

const FEATURES = [
  {
    icon: Icons.Crosshair,
    title: "Discovery OSM",
    body: "Ristoranti, idraulici, dentisti, hotel: 15 categorie con tag OpenStreetMap e dedup per osmId.",
  },
  {
    icon: Icons.Shield,
    title: "Health Score",
    body: "HTTPS, viewport, velocità, markup, generator, copyright, SEO, PageSpeed. Score basso = priorità alta.",
  },
  {
    icon: Icons.Spark,
    title: "Pitch AI",
    body: "Messaggi corti, specifici, in italiano. Con OpenAI o template smart se la chiave non c’è.",
  },
  {
    icon: Icons.Map,
    title: "Mappa radar",
    body: "Pin rossi, ambra e verdi. Vedi i buchi digitali del quartiere e apri il pitch dal popup.",
  },
];

const DEMO = [
  ["Trattoria Da Enzo", "Ristoranti", "Nessun sito", "0", "hot"],
  ["Studio Dentistico Bianchi", "Dentisti", "Sito critico", "22", "warn"],
  ["Idraulica Roma Est", "Idraulici", "Nessun sito", "0", "hot"],
  ["Pizzeria Vesuvio", "Ristoranti", "Presenza solida", "78", "ok"],
  ["Farmacia San Lorenzo", "Sanità", "Da ottimizzare", "44", "warn"],
] as const;

export default function Landing() {
  return (
    <div className="min-h-dvh">
      <a
        href="#contenuto"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 btn btn-primary"
      >
        Vai al contenuto
      </a>

      <header className="nav-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
          <Brand />
          <nav className="hidden md:flex items-center gap-7 text-sm text-[var(--muted)]">
            <a href="#metodo" className="hover:text-white transition-colors">
              Metodo
            </a>
            <a href="#score" className="hover:text-white transition-colors">
              Score
            </a>
            <a href="#radar" className="hover:text-white transition-colors">
              Radar
            </a>
          </nav>
          <Link href="/dashboard" className="btn btn-primary btn-sm">
            Entra nel radar
            <Icons.Arrow className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <main id="contenuto">
        <section className="max-w-6xl mx-auto px-5 pt-16 pb-20 md:pt-24 md:pb-28 grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
          <div>
            <p className="kicker mb-5">Lead generation territoriale</p>
            <h1 className="font-display font-extrabold hero-title text-white">
              Il radar che trova
              <br />
              PMI{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-indigo-300">
                invisibili
              </span>{" "}
              online.
            </h1>
            <p className="mt-6 text-lg text-[var(--muted)] max-w-[52ch] leading-relaxed">
              Scansiona una zona, qualifica ogni attività con un Health Score
              0–100 e genera il primo contatto. Pensato per agenzie web e
              freelance che vogliono pipeline, non fogli Excel.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/dashboard" className="btn btn-primary">
                Apri il command center
                <Icons.Arrow className="w-4 h-4" />
              </Link>
              <a href="#metodo" className="btn btn-ghost">
                Come funziona
              </a>
            </div>
            <dl className="mt-10 grid grid-cols-3 gap-4 max-w-md">
              {[
                ["15", "categorie"],
                ["0–100", "health score"],
                ["1 click", "email / WA"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="font-display text-2xl font-bold text-white">{v}</dt>
                  <dd className="text-xs text-[var(--faint)] uppercase tracking-wider mt-1">
                    {l}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <RadarHero />
        </section>

        <section id="metodo" className="max-w-6xl mx-auto px-5 pb-24">
          <p className="kicker mb-3">Protocollo</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-10">
            Tre passi. Dalla mappa al messaggio.
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {STEPS.map((s) => (
              <article key={s.n} className="glass rounded-2xl p-6">
                <div className="font-mono text-cyan-300/80 text-sm mb-4">{s.n}</div>
                <h3 className="font-display text-xl font-semibold text-white mb-2">
                  {s.title}
                </h3>
                <p className="text-sm text-[var(--muted)] leading-relaxed">{s.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-5 pb-24">
          <div className="bento">
            {FEATURES.map((f, i) => (
              <article
                key={f.title}
                className={`glass rounded-2xl p-6 ${i === 0 ? "md:row-span-2" : ""}`}
              >
                <f.icon className="w-6 h-6 text-cyan-300 mb-4" />
                <h3 className="font-display text-xl font-semibold text-white mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-[var(--muted)] leading-relaxed">{f.body}</p>
                {i === 0 && (
                  <p className="mt-6 text-xs font-mono text-[var(--faint)] leading-relaxed">
                    Nominatim · Overpass · Wikidata · ricerca web · guess dominio
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>

        <section id="score" className="max-w-6xl mx-auto px-5 pb-24">
          <p className="kicker mb-3">Algoritmo</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-3">
            Score basso = lead caldo.
          </h2>
          <p className="text-[var(--muted)] max-w-xl mb-8">
            Parte da 100 e toglie punti a ogni problema. Un’attività senza sito
            vale 0: è il bersaglio migliore.
          </p>
          <div className="glass rounded-2xl p-6 md:p-8">
            <div className="flex justify-between text-xs font-mono text-[var(--muted)] mb-2">
              <span>Critico</span>
              <span>Solido</span>
            </div>
            <div className="score-track" />
            <div className="mt-3 flex justify-between text-[11px] text-[var(--faint)]">
              <span>0 nessun sito</span>
              <span>45 grave</span>
              <span>70 migliorabile</span>
              <span>100 ok</span>
            </div>
            <ul className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              {[
                ["−100", "Sito assente"],
                ["−20", "Nessun HTTPS"],
                ["−25", "Non mobile"],
                ["−15", "Caricamento lento"],
                ["−15", "Tech deprecate"],
                ["−10", "SEO carente"],
                ["−10", "Generator obsoleto"],
                ["−10", "PageSpeed basso"],
              ].map(([n, l]) => (
                <li
                  key={l}
                  className="flex items-center justify-between rounded-xl border border-[var(--line)] px-3 py-2.5"
                >
                  <span className="text-[var(--muted)]">{l}</span>
                  <span className="font-mono text-rose-300">{n}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="radar" className="max-w-6xl mx-auto px-5 pb-24">
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <p className="kicker mb-3">Anteprima</p>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-white">
                Una coda già ordinata per gravità.
              </h2>
            </div>
            <Link href="/dashboard" className="hidden sm:inline-flex btn btn-ghost btn-sm">
              Provala dal vivo
            </Link>
          </div>
          <div className="overflow-x-auto glass rounded-2xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-[var(--faint)]">
                  <th className="px-5 py-3 font-medium">Attività</th>
                  <th className="px-5 py-3 font-medium">Categoria</th>
                  <th className="px-5 py-3 font-medium">Stato digitale</th>
                  <th className="px-5 py-3 font-medium">Score</th>
                </tr>
              </thead>
              <tbody>
                {DEMO.map(([name, cat, state, score, tone]) => (
                  <tr key={name} className="border-t border-[var(--line)]">
                    <td className="px-5 py-3.5 font-medium text-white">{name}</td>
                    <td className="px-5 py-3.5 text-[var(--muted)]">{cat}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          tone === "hot"
                            ? "bg-rose-500/15 text-rose-300"
                            : tone === "ok"
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-amber-500/15 text-amber-300"
                        }`}
                      >
                        {state}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-white">{score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-5 pb-24">
          <div className="glass rounded-[1.6rem] px-8 py-12 md:px-14 md:py-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-transparent to-indigo-500/10" />
            <div className="relative">
              <h2 className="font-display text-3xl md:text-5xl font-bold text-white">
                Pronto a cacciare?
              </h2>
              <p className="mt-4 text-[var(--muted)] max-w-lg mx-auto">
                Avvia una scansione su Palermo, Milano o il tuo CAP. In pochi
                minuti hai una lista di lead ordinata per opportunità.
              </p>
              <Link href="/dashboard" className="btn btn-primary mt-8">
                Entra nel command center
                <Icons.Arrow className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "LocalWeb Hunter",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
            description:
              "Radar per lead generation locale: scopre PMI senza sito o con siti obsoleti e genera pitch di contatto.",
          }),
        }}
      />

      <footer className="border-t border-[var(--line)]">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-wrap gap-3 items-center justify-between text-sm text-[var(--muted)]">
          <span>LocalWeb Hunter · discovery OSM · scoring · outreach</span>
          <span className="text-[var(--faint)]">
            Dati pubblici. Outreach B2B soggetto a GDPR.
          </span>
        </div>
      </footer>
    </div>
  );
}
