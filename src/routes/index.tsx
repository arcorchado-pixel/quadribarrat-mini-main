import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { categories as mockCategories, CURRENT_ROUND, leaders, standings, type Category, type Match, type Team } from "@/lib/data";
import { useLiveCategories, isHiddenPlayer } from "@/lib/remote";
import { supabase } from "@/lib/supabase";

import courtBg from "@/assets/fenix_background.png";
import uesaLogo from "@/assets/uesa_logo.png";
import joventutLogo from "@/assets/joventut_logo.png";
import artesLogo from "@/assets/artes_logo.png";
import argentonaLogo from "@/assets/argentona_logo.png";
import mataroLogo from "@/assets/mataro_logo.png";

const CLUB_LOGOS: [string, string][] = [
  ["sant andreu", uesaLogo],
  ["joventut", joventutLogo],
  ["artés", artesLogo],
  ["artes", artesLogo],
  ["argentona", argentonaLogo],
  ["mataró", mataroLogo],
  ["mataro", mataroLogo],
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mini Quadribarrat — UE Sant Andreu: classificacions i resultats" },
      { name: "description", content: "Consulta classificacions, partits de la jornada i estadístiques de jugadors del bàsquet català." },
      { property: "og:title", content: "Mini Quadribarrat — UE Sant Andreu" },
      { property: "og:description", content: "Classificacions, partits i estadístiques del bàsquet català." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Crest({ team, size = 32 }: { team: Team; size?: number }) {
  const clubLogo = CLUB_LOGOS.find(([k]) => team.name.toLowerCase().includes(k))?.[1] ?? null;
  if (clubLogo) {
    const big = team.name.toLowerCase().includes("sant andreu") ? 1.3 : 1;
    return (
      <img
        src={clubLogo}
        alt={team.name}
        className="shrink-0 object-contain"
        style={{ width: size * big, height: size * big, margin: big > 1 ? -size * 0.15 : 0 }}
      />
    );
  }
  if (team.logo) {
    return (
      <img
        src={team.logo}
        alt={team.name}
        className="shrink-0 rounded-full object-cover ring-2 ring-card"
        style={{ width: size, height: size, background: team.color }}
      />
    );
  }
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold text-header-foreground ring-2 ring-card"
      style={{ width: size, height: size, background: team.color, fontSize: size * 0.32 }}
      aria-hidden
    >
      {team.short}
    </span>
  );
}

function StatusBadge({ s }: { s: Match["status"] }) {
  const cls =
    s === "Finalitzat"
      ? "bg-secondary text-secondary-foreground"
      : s === "En joc"
        ? "bg-live text-primary-foreground animate-pulse"
        : "bg-accent/30 text-foreground";
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cls}`}>{s}</span>;
}

const FAV_KEY = "cistella-fav";
const LEAGUE_KEY = "cistella-league";

function Index() {
  const [fav, setFav] = useState<string | null>(() => (typeof window === "undefined" ? null : localStorage.getItem(FAV_KEY)));
  const [catId, setCatId] = useState(() => {
    if (typeof window === "undefined") return "0";
    const savedCat = localStorage.getItem(LEAGUE_KEY);
    if (savedCat) return savedCat;
    const f = localStorage.getItem(FAV_KEY);
    if (f) {
      const c = mockCategories.find((c) => c.teams.some((t) => t.id === f));
      if (c) return c.id;
    }
    return "0";
  });
  const q = "";
  const [tab, setTab] = useState<"class" | "games" | "leaders">("class");
  const [round, setRound] = useState(CURRENT_ROUND);
  const [open, setOpen] = useState<Match | null>(null);
  const [teamOpen, setTeamOpen] = useState<Team | null>(null);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const toggleFav = (id: string) => {
    const next = fav === id ? null : id;
    setFav(next);
    if (next) localStorage.setItem(FAV_KEY, next);
    else localStorage.removeItem(FAV_KEY);
  };

  const { categories, source } = useLiveCategories();

  const orderedCategories = useMemo(() => {
    return [...categories].sort((a, b) => b.name.localeCompare(a.name, "ca"));
  }, [categories]);

  const cat =
    orderedCategories.find((c) => c.id === catId) ??
    orderedCategories.find((c) => c.teams.some((t) => t.id === fav)) ??
    orderedCategories[0]!;

  const handleLeagueChange = (nextId: string) => {
    setCatId(nextId);
    if (typeof window !== "undefined") {
      localStorage.setItem(LEAGUE_KEY, nextId);
    }
    const chosen = orderedCategories.find((c) => c.id === nextId);
    if (chosen) {
      const rList = chosen.matches.map((m) => Number(m.round) || 1);
      setRound(rList.length ? Math.max(...rList) : 1);
    }
  };

  useEffect(() => {
    if (source !== "db") return;
    if (!orderedCategories.some((c) => c.id === catId)) {
      setCatId(cat.id);
      const roundsWithMatches = cat.matches.map((m) => Number(m.round) || 1);
      setRound(roundsWithMatches.length ? Math.max(...roundsWithMatches) : 1);
    }
  }, [source, orderedCategories, catId, cat.id, cat.matches]);

  const maxRound = useMemo(
    () => Math.max(Number(cat.rounds) || 1, ...cat.matches.map((m) => Number(m.round) || 1), 1),
    [cat.rounds, cat.matches],
  );

  const ql = q.trim().toLowerCase();
  const rows = useMemo(() => standings(cat), [cat]);
  const fr = rows.filter((r) => !ql || r.team.name.toLowerCase().includes(ql));

  const games = cat.matches.filter(
    (m) => (Number(m.round) || 1) === round && (!ql || m.home.name.toLowerCase().includes(ql) || m.away.name.toLowerCase().includes(ql)),
  );

  const headRef = useRef<HTMLElement>(null);
  const [headH, setHeadH] = useState(0);

  useEffect(() => {
    const el = headRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeadH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="relative min-h-screen">
      <div aria-hidden className="pointer-events-none fixed inset-x-0 bottom-0 -z-10 overflow-hidden bg-header" style={{ top: headH }}>
        <img src={courtBg} alt="" className="h-full w-full object-cover object-top" />
      </div>
      <header ref={headRef} className="sticky top-0 z-20 bg-header text-header-foreground shadow-lg">
        <div className="court-stripe h-1" />
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <h1 className="font-display text-2xl font-bold uppercase tracking-wide">
              Mini <span className="text-primary">Quadribarrat</span>
            </h1>
            <button
              onClick={() => setDark(!dark)}
              className="rounded-full border border-header-foreground/20 px-3 py-1 text-sm hover:bg-header-foreground/10"
              aria-label="Canviar mode"
            >
              {dark ? "☀️" : "🌙"}
            </button>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <img src={uesaLogo} alt="UE Sant Andreu" className="h-28 w-auto shrink-0 drop-shadow sm:h-32" />
            <p className="font-slogan text-2xl leading-tight sm:text-4xl">
              El Millor de tot Arreu. <span className="text-primary">Sant Andreu és la canya</span>
            </p>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl px-4">
          {([
            ["class", "Classificació"],
            ["games", "Partits"],
            ["leaders", "Rànquings"],
          ] as const).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`whitespace-nowrap border-b-4 px-3 py-2 font-display text-base font-semibold uppercase tracking-wide transition sm:px-4 sm:text-lg ${
                tab === k ? "border-primary text-header-foreground" : "border-transparent text-header-foreground/60 hover:text-header-foreground"
              }`}
            >
              {l}
            </button>
          ))}
        </nav>
      </header>

      {source === "loading" && (
        <p className="fixed inset-x-0 top-1/2 z-10 mx-auto w-fit rounded-xl bg-header px-5 py-2 font-display text-xl uppercase text-header-foreground shadow-lg">
          Carregant…
        </p>
      )}
      <main
        className={`mx-auto flex max-w-5xl flex-col justify-center px-3 py-5 sm:px-4 ${source === "loading" ? "invisible" : ""}`}
        style={{ minHeight: `calc(100vh - ${headH}px)` }}
      >
        <div className="mx-auto mb-4 flex w-full max-w-xl flex-col items-center gap-2">
          <h2 className="w-fit rounded-xl bg-header px-5 py-1.5 text-center font-display text-3xl font-bold uppercase tracking-wide text-gold shadow-lg drop-shadow-lg sm:text-4xl">
            {cat.name}
          </h2>

          {orderedCategories.length > 1 && (
            <label className="flex w-full max-w-md items-center justify-between gap-2 rounded-xl border bg-card/95 px-3 py-2 text-sm shadow-sm backdrop-blur-sm">
              <span className="shrink-0 font-semibold text-muted-foreground">Triar lliga:</span>
              <select
                value={cat.id}
                onChange={(e) => handleLeagueChange(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border bg-background px-2.5 py-1.5 font-semibold text-foreground focus:border-primary focus:outline-none"
              >
                {orderedCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {tab === "leaders" ? (
          <Leaders cat={cat} ql={ql} />
        ) : tab === "class" ? (
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <table className="w-full text-sm tabular-nums">
              <thead className="bg-muted text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 text-left">#</th>
                  <th className="px-2 py-2 text-left">Equip</th>
                  <th className="px-1.5 py-2">J</th>
                  <th className="px-1.5 py-2">G</th>
                  <th className="px-1.5 py-2">P</th>
                  <th className="hidden px-1.5 py-2 sm:table-cell">PF</th>
                  <th className="hidden px-1.5 py-2 sm:table-cell">PC</th>
                  <th className="px-2 py-2 text-primary">Pts</th>
                </tr>
              </thead>
              <tbody>
                {fr.map((r) => {
                  const pos = rows.indexOf(r) + 1;
                  const isFav = fav === r.team.id;
                  return (
                    <tr key={r.team.id} className={`border-t text-center hover:bg-muted/50 ${isFav ? "bg-gold/15" : ""}`}>
                      <td className="px-2 py-2.5 text-left">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded font-display font-bold ${
                            pos <= 4 ? "bg-primary text-primary-foreground" : pos >= rows.length ? "bg-destructive/15 text-destructive" : ""
                          }`}
                        >
                          {pos}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-left">
                        <div className="flex items-center gap-2">
                          <Crest team={r.team} size={40} />
                          <span className="font-semibold leading-tight">{r.team.name}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFav(r.team.id);
                            }}
                            aria-label={isFav ? "Treure de favorits" : "Marcar com a favorit"}
                            className={`ml-auto text-lg transition hover:scale-125 ${isFav ? "" : "opacity-30 grayscale"}`}
                          >
                            {isFav ? "❤️" : "🤍"}
                          </button>
                        </div>
                      </td>
                      <td className="px-1.5">{r.j}</td>
                      <td className="px-1.5 font-semibold text-success">{r.g}</td>
                      <td className="px-1.5 text-destructive">{r.p}</td>
                      <td className="hidden px-1.5 sm:table-cell">{r.pf}</td>
                      <td className="hidden px-1.5 sm:table-cell">{r.pc}</td>
                      <td className="px-2 font-display text-lg font-bold">{r.pts}</td>
                    </tr>
                  );
                })}
                {!fr.length && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      Cap equip trobat
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <>
            <div className="mx-auto mb-4 flex w-fit items-center justify-center gap-3 rounded-xl bg-header px-3 py-2 text-header-foreground shadow-lg">
              <button
                disabled={round <= 1}
                onClick={() => setRound(round - 1)}
                className="h-10 w-10 rounded-full bg-card font-bold text-card-foreground shadow disabled:opacity-30"
                aria-label="Jornada anterior"
              >
                ‹
              </button>
              <span className="min-w-36 text-center font-display text-2xl font-bold uppercase">Jornada {round}</span>
              <button
                disabled={round >= maxRound}
                onClick={() => setRound(round + 1)}
                className="h-10 w-10 rounded-full bg-card font-bold text-card-foreground shadow disabled:opacity-30"
                aria-label="Jornada següent"
              >
                ›
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {games.map((m) => {
                const clickable = m.status === "Finalitzat";
                return (
                  <button
                    key={m.id}
                    disabled={!clickable}
                    onClick={() => setOpen(m)}
                    className={`rounded-xl border bg-card p-4 text-left shadow-sm transition ${
                      clickable ? "hover:-translate-y-0.5 hover:border-primary hover:shadow-md" : "cursor-default"
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="capitalize">
                        {m.date} · {m.time}
                      </span>
                      <StatusBadge s={m.status} />
                    </div>
                    {(
                      [
                        [m.home, m.hs, m.as],
                        [m.away, m.as, m.hs],
                      ] as [Team, number | undefined, number | undefined][]
                    ).map(([t, s, o], i) => (
                      <div key={i} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                          <Crest team={t} size={44} />
                          <span className={`font-semibold ${s !== undefined && s > (o ?? 0) ? "" : "text-muted-foreground"}`}>{t.name}</span>
                        </div>
                        <span className="font-display text-2xl font-bold tabular-nums">{s ?? "–"}</span>
                      </div>
                    ))}
                    <div className="mt-2 flex justify-between border-t pt-2 text-xs text-muted-foreground">
                      <span>📍 {m.venue}</span>
                      {clickable && <span className="font-semibold text-primary">Estadístiques →</span>}
                    </div>
                  </button>
                );
              })}
              {!games.length && <p className="col-span-full py-8 text-center text-muted-foreground">Cap partit trobat</p>}
            </div>
          </>
        )}
      </main>
      {open && <MatchModal m={open} onClose={() => setOpen(null)} />}
      {teamOpen && <TeamModal cat={cat} team={teamOpen} onClose={() => setTeamOpen(null)} />}
    </div>
  );
}

function Avatar({ name, team, size = 30 }: { name: string; team: Team; size?: number }) {
  const ini = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center rounded-full bg-secondary font-display font-bold text-secondary-foreground"
      style={{ width: size, height: size, fontSize: size * 0.38, boxShadow: `0 0 0 2px ${team.color}` }}
      aria-hidden
    >
      {ini}
    </span>
  );
}

const LEAD_FILTERS = [
  ["pts", "Punts (PTS)"],
  ["t3", "Triples (T3)"],
  ["t2", "Canastes de 2 (T2)"],
  ["tl", "Tirs lliures (TL)"],
  ["reb", "Rebots (REB)"],
  ["ro", "Rebots ofensius"],
  ["rd", "Rebots defensius"],
  ["ast", "Assistències (AST)"],
  ["rec", "Recuperacions (REC)"],
  ["tap", "Taps (TAP)"],
] as const;
type LeadKey = (typeof LEAD_FILTERS)[number][0];
type RankRow = { id: string; name: string; num: number; gp: number } & Record<LeadKey, number>;
const COLS: Record<LeadKey, string> = {
  pts: "puntos",
  t3: "triples",
  t2: "canasta_2",
  tl: "tiros_libres",
  reb: "total_rebotes",
  ro: "rebote_ofensivo",
  rd: "rebote_defensivo",
  ast: "asistencias",
  rec: "recuperaciones",
  tap: "tapones",
};
const DORSAL_FIX: Record<string, number> = { GAEL: 22 };

function useRankings() {
  const [rows, setRows] = useState<RankRow[] | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await supabase
        .from("estadisticas_jugadores")
        .select(`nombre_jugador,dorsal,partido_id,${Object.values(COLS).join(",")}`);
      if (!alive) return;
      const map = new Map<string, RankRow & { games: Set<string | number> }>();
      for (const r of (data ?? []) as unknown as Record<string, unknown>[]) {
        const name = String(r["nombre_jugador"] ?? "").trim();
        const key = name.toUpperCase();
        if (isHiddenPlayer(name)) continue;
        const cur =
          map.get(key) ??
          ({
            id: key,
            name,
            num: DORSAL_FIX[key] ?? Number(r["dorsal"] ?? 0),
            gp: 0,
            games: new Set<string | number>(),
            ...Object.fromEntries(Object.keys(COLS).map((k) => [k, 0])),
          } as RankRow & { games: Set<string | number> });
        for (const [k, col] of Object.entries(COLS)) cur[k as LeadKey] += Number(r[col] ?? 0);
        if (r["partido_id"] != null) cur.games.add(r["partido_id"] as string | number);
        cur.gp = cur.games.size;
        map.set(key, cur);
      }
      setRows([...map.values()]);
    };
    load();
    const ch = supabase
      .channel("rankings-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "estadisticas_jugadores" }, load)
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, []);
  return rows;
}

function Leaders({ cat, ql }: { cat: Category; ql: string }) {
  const [k, setK] = useState<LeadKey>("pts");
  const [sel, setSel] = useState<RankRow | null>(null);
  const all = useRankings() ?? [];
  const team = cat.teams.find((t) => t.name.toLowerCase().includes("sant andreu")) ?? cat.teams[0]!;
  const sorted = [...all].sort((a, b) => b[k] - a[k] || b.pts - a.pts);
  const list = sorted.filter((l) => !ql || l.name.toLowerCase().includes(ql));
  return (
    <>
      <div className="-mx-3 mb-4 flex gap-2 overflow-x-auto px-3 pb-1">
        {LEAD_FILTERS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setK(key)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              k === key ? "bg-primary text-primary-foreground shadow" : "bg-card text-muted-foreground border hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <ol className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {list.map((l) => {
          const pos = sorted.indexOf(l) + 1;
          return (
            <li
              key={l.id}
              onClick={() => setSel(l)}
              className={`flex cursor-pointer items-center gap-3 border-t px-3 py-2.5 first:border-t-0 hover:bg-muted/50 ${pos <= 3 ? "bg-gold/10" : ""}`}
            >
              <span className="w-8 text-center font-display text-xl font-bold">{`${pos}º`}</span>
              <Avatar name={l.name} team={team} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold leading-tight">
                  {l.name} <span className="text-xs text-muted-foreground">#{l.num}</span>
                </p>
                <p className="truncate text-xs text-muted-foreground">{l.gp} PJ</p>
              </div>
              <div className="text-right">
                <p className={`font-display text-3xl font-bold leading-none tabular-nums ${k === "pts" ? "text-success" : "text-primary"}`}>{l[k]}</p>
                <p className="text-[10px] uppercase text-muted-foreground">{(l[k] / Math.max(1, l.gp)).toFixed(1)} / partit</p>
              </div>
            </li>
          );
        })}
        {!list.length && <li className="py-8 text-center text-muted-foreground">Cap jugador trobat</li>}
      </ol>
      {sel && <PlayerCard p={sel} onClose={() => setSel(null)} />}
    </>
  );
}

function PlayerCard({ p, onClose }: { p: RankRow; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl bg-card p-5 shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="font-display text-2xl font-bold uppercase">{p.name}</h3>
            <p className="text-xs text-muted-foreground">
              Dorsal #{p.num} · {p.gp} PJ
            </p>
          </div>
          <button onClick={onClose} aria-label="Tancar" className="text-lg">
            ✕
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm tabular-nums">
          {LEAD_FILTERS.map(([key, label]) => (
            <div key={key} className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-display text-lg font-bold">{p[key]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MatchModal({ m, onClose }: { m: Match; onClose: () => void }) {
  const real = useEstadisticas(m.id);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-card sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="bg-header p-5 text-header-foreground">
          <div className="flex justify-between text-xs opacity-70">
            <span className="capitalize">
              {m.date} · {m.venue}
            </span>
            <button onClick={onClose} aria-label="Tancar" className="text-lg">
              ✕
            </button>
          </div>
          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
            <div className="flex flex-col items-center gap-1">
              <Crest team={m.home} size={72} />
              <span className="text-sm font-semibold">{m.home.name}</span>
            </div>
            <span className="font-display text-5xl font-bold tabular-nums">
              {m.hs}
              <span className="mx-2 text-primary">-</span>
              {m.as}
            </span>
            <div className="flex flex-col items-center gap-1">
              <Crest team={m.away} size={72} />
              <span className="text-sm font-semibold">{m.away.name}</span>
            </div>
          </div>
        </div>
        {m.quarters && (
          <div className="overflow-x-auto p-4">
            <table className="w-full text-center text-sm tabular-nums">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="text-left">Equip</th>
                  {m.quarters!.map((_, i) => (
                    <th key={i} className="px-1.5 py-1">
                      Q{i + 1}
                    </th>
                  ))}
                  <th className="px-2">T</th>
                </tr>
              </thead>
              <tbody>
                {[m.home, m.away].map((t, ti) => (
                  <tr key={t.id} className="border-t">
                    <td className="py-1.5 text-left font-semibold">{t.short}</td>
                    {m.quarters!.map((q, i) => (
                      <td key={i}>{q[ti]}</td>
                    ))}
                    <td className="font-display text-base font-bold">{ti ? m.as : m.hs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {real && real.length > 0 && <RealStats rows={real} team={m.home} />}
      </div>
    </div>
  );
}

const SQUAD_COLS = [
  ["pj", "PJ"],
  ["ppp", "PPP"],
  ["pts", "PTS"],
  ["t1", "TL"],
  ["t2", "T2"],
  ["t3", "T3"],
  ["f", "F"],
] as const;
type SquadKey = (typeof SQUAD_COLS)[number][0];

function TeamModal({ cat, team, onClose }: { cat: Category; team: Team; onClose: () => void }) {
  const [k, setK] = useState<SquadKey>("pts");
  const rows = standings(cat);
  const pos = rows.findIndex((r) => r.team.id === team.id) + 1;
  const row = rows[pos - 1]!;
  const squad = leaders(cat)
    .filter((l) => l.team.id === team.id)
    .map((l) => ({ ...l, pj: l.gp, ppp: l.gp ? l.pts / l.gp : 0 }));
  squad.sort((a, b) => b[k] - a[k] || b.pts - a.pts);
  const tot = (key: "pts" | "t1" | "t2" | "t3" | "f") => squad.reduce((a, p) => a + p[key], 0);
  const colCls = (key: SquadKey) => (key === "pts" || key === "ppp" ? "text-success" : key === "f" ? "text-destructive" : "");
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-card sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="bg-header p-5 text-header-foreground">
          <div className="flex justify-between text-xs opacity-70">
            <span>{cat.name}</span>
            <button onClick={onClose} aria-label="Tancar" className="text-lg">
              ✕
            </button>
          </div>
          <div className="mt-3 flex items-center gap-4">
            <Crest team={team} size={88} />
            <div>
              <h2 className="font-display text-3xl font-bold uppercase leading-none">{team.name}</h2>
              <div className="mt-2 flex flex-wrap gap-2 text-sm">
                <span className="rounded-full bg-primary px-3 py-0.5 font-semibold text-primary-foreground">{pos}º posició</span>
                <span className="rounded-full bg-header-foreground/10 px-3 py-0.5">{row.j} PJ</span>
                <span className="rounded-full bg-header-foreground/10 px-3 py-0.5">
                  <b className="text-success">{row.g}V</b> – <b className="text-destructive">{row.p}D</b>
                </span>
                <span className="rounded-full bg-header-foreground/10 px-3 py-0.5">{row.pts} pts</span>
              </div>
            </div>
          </div>
        </div>
        <div className="border-b px-4">
          <span className="inline-block border-b-4 border-primary py-2 font-display text-lg font-semibold uppercase">
            Plantilla i estadístiques de la temporada
          </span>
        </div>
        <div className="overflow-x-auto p-3 sm:p-4">
          <p className="mb-2 text-xs text-muted-foreground">Toca una columna per ordenar de més a menys.</p>
          <table className="w-full text-base tabular-nums sm:text-sm">
            <thead className="bg-muted text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-1 py-2.5">#</th>
                <th className="px-1 text-left">Jugador</th>
                {SQUAD_COLS.map(([key, label]) => (
                  <th key={key} className="px-0.5">
                    <button
                      onClick={() => setK(key)}
                      className={`rounded px-1.5 py-1 uppercase ${k === key ? "bg-primary text-primary-foreground" : `hover:text-foreground ${colCls(key)}`}`}
                    >
                      {label}
                      {k === key ? " ↓" : ""}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {squad.map((p) => (
                <tr key={p.id} className="border-t text-center">
                  <td className="px-1 py-2.5 font-display font-bold text-muted-foreground">{p.num}</td>
                  <td className="px-1 text-left">
                    <div className="flex items-center gap-2">
                      <Avatar name={p.name} team={team} />
                      <span className="font-medium leading-tight">{p.name}</span>
                    </div>
                  </td>
                  {SQUAD_COLS.map(([key]) => (
                    <td key={key} className={`px-1.5 ${colCls(key)} ${k === key ? "bg-primary/10 font-display text-lg font-bold" : ""}`}>
                      {key === "ppp" ? p.ppp.toFixed(1) : p[key]}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t-2 border-foreground/30 bg-muted text-center font-bold">
                <td />
                <td className="px-1 py-2.5 text-left font-display uppercase">Total</td>
                <td className="px-1.5">{row.j}</td>
                <td className="px-1.5 text-success">{row.j ? (tot("pts") / row.j).toFixed(1) : "0"}</td>
                <td className="px-1.5 text-success">{tot("pts")}</td>
                <td className="px-1.5">{tot("t1")}</td>
                <td className="px-1.5">{tot("t2")}</td>
                <td className="px-1.5">{tot("t3")}</td>
                <td className="px-1.5 text-destructive">{tot("f")}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

type EstRow = {
  id: number;
  dorsal: number | null;
  nombre_jugador: string;
  puntos: number | null;
  tiros_libres: number | null;
  canasta_2: number | null;
  triples: number | null;
  total_rebotes: number | null;
  rebote_ofensivo: number | null;
  rebote_defensivo: number | null;
  asistencias: number | null;
  recuperaciones: number | null;
  tapones: number | null;
};
const EST_COLS =
  "id,dorsal,nombre_jugador,puntos,tiros_libres,canasta_2,triples,total_rebotes,rebote_ofensivo,rebote_defensivo,asistencias,recuperaciones,tapones";
const EST_STATS = [
  ["puntos", "PTS"],
  ["tiros_libres", "TL"],
  ["canasta_2", "T2"],
  ["triples", "T3"],
  ["total_rebotes", "REB"],
  ["rebote_ofensivo", "RO"],
  ["rebote_defensivo", "RD"],
  ["asistencias", "AST"],
  ["recuperaciones", "REC"],
  ["tapones", "TAP"],
] as const;
type EstKey = (typeof EST_STATS)[number][0];

function useEstadisticas(matchId: string | number) {
  const [rows, setRows] = useState<EstRow[] | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data, error } = await supabase.from("estadisticas_jugadores").select(EST_COLS).eq("partido_id", matchId);
      if (error) console.error("Supabase:", error.message);
      if (!alive) return;
      const out: EstRow[] = [];
      for (const r of (data ?? []) as EstRow[]) {
        if (isHiddenPlayer(r.nombre_jugador)) continue;
        out.push(r);
      }
      setRows(out);
    };
    load();
    const ch = supabase
      .channel(`est-match-${matchId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "estadisticas_jugadores" }, load)
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [matchId]);
  return rows;
}

function RealStats({ rows, team }: { rows: EstRow[]; team: Team }) {
  const s = (k: EstKey) => rows.reduce((a, r) => a + (r[k] ?? 0), 0);
  return (
    <div className="p-3 sm:p-4">
      <p className="mb-2 text-xs text-muted-foreground sm:hidden">Llisca cap a l'esquerra per veure totes les estadístiques.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-base tabular-nums sm:text-sm">
          <thead className="bg-muted text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="sticky left-0 z-10 w-10 bg-muted px-1 py-2.5 text-left">#</th>
              <th className="sticky left-10 z-10 bg-muted px-1 py-2.5 text-left">Jugador</th>
              {EST_STATS.map(([key, label]) => (
                <th key={key} className={`px-1.5 py-2.5 ${key === "puntos" ? "text-success" : ""}`}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...rows]
              .sort((a, b) => (b.puntos ?? 0) - (a.puntos ?? 0))
              .map((p) => (
                <tr key={p.id} className="border-t text-center">
                  <td className="sticky left-0 z-10 w-10 bg-card px-1 py-2.5 text-left font-display font-bold text-muted-foreground">
                    {DORSAL_FIX[(p.nombre_jugador ?? "").trim().toUpperCase()] ?? p.dorsal ?? "–"}
                  </td>
                  <td className="sticky left-10 z-10 bg-card px-1 text-left">
                    <div className="flex items-center gap-2">
                      <Avatar name={p.nombre_jugador} team={team} />
                      <span className="whitespace-nowrap font-medium leading-tight">{p.nombre_jugador}</span>
                    </div>
                  </td>
                  {EST_STATS.map(([key]) => (
                    <td key={key} className={`px-1.5 ${key === "puntos" ? "font-display text-lg font-bold text-success" : ""}`}>
                      {p[key] ?? 0}
                    </td>
                  ))}
                </tr>
              ))}
            <tr className="border-t-2 border-foreground/30 bg-muted font-bold">
              <td className="sticky left-0 z-10 bg-muted px-1 py-2.5" />
              <td className="sticky left-10 z-10 bg-muted px-1 py-2.5 text-left font-display uppercase">Total</td>
              {EST_STATS.map(([key]) => (
                <td key={key} className={`px-1.5 ${key === "puntos" ? "font-display text-lg font-bold text-success" : ""}`}>
                  {s(key)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}