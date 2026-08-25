import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-dvh grid place-items-center px-6 text-center">
      <div>
        <p className="kicker mb-3">404</p>
        <h1 className="font-display text-4xl font-bold text-white">Fuori dal raggio.</h1>
        <p className="text-[var(--muted)] mt-3 mb-8">Questa pagina non è sulla mappa.</p>
        <Link href="/" className="btn btn-primary">
          Torna al radar
        </Link>
      </div>
    </div>
  );
}
