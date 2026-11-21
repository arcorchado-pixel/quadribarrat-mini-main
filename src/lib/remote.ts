import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { categories as mockCategories, type Category, type Match, type PlayerStat, type Status, type Team } from "@/lib/data";

type TeamRow = { id: string | number; Name: string; Category: string | null; "Logo URL": string | null };
type PlayerRow = { id: string | number; Name: string; Number: number | null; "Team Id": string | number | null };
type MatchRow = {
  id: string | number;
  Category: string | null;
  Jornada: number | string | null;
  "Date Time": string | null;
  "Home Team": string | number | null;
  "Away Team": string | number | null;
  "Home Score": number | null;
  "Away Score": number | null;
  Status: string | null;
} & Record<string, unknown>;

type StatRow = {
  id: string | number;
  partido_id: string | number | null;
  jugador: string;
  dorsal?: number | null;
  equipo: string | null;
  puntos: number | null;
  faltas: number | null;
  tiros_1_puntero?: number | null;
  tiros_2_puntos?: number | null;
  triples?: number | null;
} & Record<string, unknown>;

export const isHiddenPlayer = (name: unknown) => {
  if (!name) return false;
  const upper = String(name).trim().toUpperCase();
  const hiddenNames = ["ORIOL"];
  return hiddenNames.some((h) => upper.includes(h));
};

const norm = (s: unknown) => String(s ?? "").trim().toLowerCase();

function colorFor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `oklch(0.55 0.18 ${h})`;
}

function shortFor(name: string) {
  const w = name.replace(/[^\p{L}\s]/gu, "").split(/\s+/).filter(Boolean);
  return (w.length > 1 ? w.map((x) => x[0]).join("") : name).slice(0, 4).toUpperCase();
}

function mapStatus(s: string | null, hasScore: boolean): Status {
  const v = norm(s);
  if (/joc|live|curso|progress|playing|directo/.test(v)) return "En joc";
  if (/final|fin|jugad|played|done|complet/.test(v)) return "Finalitzat";
  if (/prog|sched|pend/.test(v)) return "Programat";
  return hasScore ? "Finalitzat" : "Programat";
}

function formatDateSafe(raw: string | null): { date: string; time: string } {
  if (!raw) return { date: "—", time: "" };
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return { date: "—", time: "" };

  const days = ["dg.", "dl.", "dt.", "dc.", "dj.", "dv.", "ds."];
  const months = ["gen.", "febr.", "març", "abr.", "maig", "juny", "jul.", "ag.", "set.", "oct.", "nov.", "des."];
  const dayName = days[d.getUTCDay()] ?? "";
  const dayNum = String(d.getUTCDate()).padStart(2, "0");
  const monthName = months[d.getUTCMonth()] ?? "";
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const mins = String(d.getUTCMinutes()).padStart(2, "0");

  return {
    date: `${dayName} ${dayNum} ${monthName}`,
    time: `${hours}:${mins}`,
  };
}

export function buildCategories(teams: TeamRow[], players: PlayerRow[], matches: MatchRow[], stats: StatRow[]): Category[] {
  const teamById = new Map<string, Team & { cat: string }>();
  const teamByName = new Map<string, Team & { cat: string }>();

  for (const t of teams) {
    const tm = {
      id: String(t.id),
      name: t.Name,
      short: shortFor(t.Name),
      color: colorFor(t.Name),
      cat: t.Category ?? "General",
      ...(t["Logo URL"] ? { logo: t["Logo URL"] } : {}),
    };
    teamById.set(tm.id, tm);
    teamByName.set(norm(t.Name), tm);
  }

  const findTeam = (ref: unknown) => teamById.get(String(ref)) ?? teamByName.get(norm(ref));

  const numByPlayer = new Map<string, number>();
  for (const p of players) {
    if (isHiddenPlayer(p.Name)) continue;
    const t = p["Team Id"] != null ? teamById.get(String(p["Team Id"])) : undefined;
    numByPlayer.set(`${norm(t?.name)}|${norm(p.Name)}`, p.Number ?? 0);
    if (!numByPlayer.has(`|${norm(p.Name)}`)) numByPlayer.set(`|${norm(p.Name)}`, p.Number ?? 0);
  }

  const cats = new Map<string, Category>();
  const getCat = (rawName: string) => {
    const clean = rawName.trim() || "General";
    const key = clean.toLowerCase();
    if (!cats.has(key)) {
      cats.set(key, { id: `db:${key}`, name: clean, teams: [], matches: [], rounds: 1 });
    }
    return cats.get(key)!;
  };

  for (const t of teamById.values()) {
    const c = getCat(t.cat);
    c.teams.push({
      id: t.id,
      name: t.name,
      short: t.short,
      color: t.color,
      ...(t.logo ? { logo: t.logo } : {}),
    });
  }

  for (const m of matches) {
    const targetCatName = m.Category && String(m.Category).trim() ? String(m.Category).trim() : "Mini Interterritorial · 1a Fase (26-27)";
    const c = getCat(targetCatName);

    const ensure = (ref: unknown, catName: string) => {
      const f = findTeam(ref);
      if (f) {
        if (!c.teams.some((t) => t.id === f.id)) {
          c.teams.push({
            id: f.id,
            name: f.name,
            short: f.short,
            color: f.color,
            ...(f.logo ? { logo: f.logo } : {}),
          });
        }
        return f;
      }
      if (ref == null || String(ref).trim() === "") return undefined;
      const name = String(ref).trim();
      const tm = { id: `auto:${name}`, name, short: shortFor(name), color: colorFor(name), cat: catName };
      teamByName.set(norm(name), tm);
      teamById.set(tm.id, tm);
      c.teams.push({ id: tm.id, name: tm.name, short: tm.short, color: tm.color });
      return tm;
    };

    const home = ensure(m["Home Team"], targetCatName);
    const away = ensure(m["Away Team"], targetCatName);
    if (!home || !away) continue;

    const hasScore = m["Home Score"] != null && m["Away Score"] != null;
    const status = mapStatus(m.Status, hasScore);
    const { date, time } = formatDateSafe(m["Date Time"]);
    const roundNum = Number(m.Jornada ?? 1) || 1;
    const matchIdStr = String(m.id).trim();

    const matchStats = stats.filter((s) => {
      const pId = String(s.partido_id ?? "").trim();
      if (isHiddenPlayer(s.jugador)) return false;
      return pId === matchIdStr;
    });

    const toStat = (s: StatRow, team: Team): PlayerStat => ({
      id: `${team.id}|${s.id}|${norm(s.jugador)}`,
      num: s.dorsal ?? numByPlayer.get(`${norm(team.name)}|${norm(s.jugador)}`) ?? numByPlayer.get(`|${norm(s.jugador)}`) ?? 0,
      name: s.jugador ?? "Desconegut",
      min: 0,
      pts: s.puntos ?? 0,
      t1: Number(s.tiros_1_puntero ?? 0),
      t2: Number(s.tiros_2_puntos ?? 0),
      t3: Number(s.triples ?? 0),
      f: s.faltas ?? 0,
    });

    const homeStatsList: PlayerStat[] = [];
    const awayStatsList: PlayerStat[] = [];

    for (const s of matchStats) {
      const statTeam = norm(s.equipo);
      if (statTeam && (statTeam.includes(norm(away.name)) || statTeam === String(away.id))) {
        awayStatsList.push(toStat(s, away));
      } else {
        homeStatsList.push(toStat(s, home));
      }
    }

    const match: Match = {
      id: matchIdStr,
      round: roundNum,
      date,
      time,
      venue: `Pavelló ${home.name}`,
      status,
      home,
      away,
      ...(hasScore ? { hs: m["Home Score"]!, as: m["Away Score"]! } : {}),
      ...(() => {
        const q: [number, number][] = [];
        for (let i = 1; i <= 8; i++) {
          const h = m[`Home Score Q${i}`];
          const a = m[`Away Score Q${i}`];
          if (h == null && a == null) continue;
          q.push([Number(h ?? 0), Number(a ?? 0)]);
        }
        return q.length ? { quarters: q } : {};
      })(),
      homeStats: homeStatsList,
      awayStats: awayStatsList,
    };

    c.matches.push(match);
    c.rounds = Math.max(c.rounds, roundNum);
  }

  return [...cats.values()].filter((c) => c.teams.length > 0 || c.matches.length > 0);
}

export type LiveSource = "db" | "mock" | "loading";

export function useLiveCategories() {
  const [cats, setCats] = useState<Category[]>(mockCategories);
  const [source, setSource] = useState<LiveSource>("loading");

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [t, p, m, s] = await Promise.all([
        supabase.from("teams").select('id,"Name","Category","Logo URL"'),
        supabase.from("Players").select('id,"Name","Number","Team Id"'),
        supabase.from("Matches").select("*"),
        supabase.from("estadisticas_jugadores").select("*"),
      ]);
      if (!alive) return;

      const built = buildCategories(
        (t.data ?? []) as unknown as TeamRow[],
        (p.data ?? []) as unknown as PlayerRow[],
        (m.data ?? []) as unknown as MatchRow[],
        (s.data ?? []) as unknown as StatRow[],
      );

      if (built.length) {
        setCats(built);
        setSource("db");
      } else {
        setCats(mockCategories);
        setSource("mock");
      }
    };

    load();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reload = () => {
      clearTimeout(timer);
      timer = setTimeout(load, 300);
    };
    const ch = supabase.channel("cistella-live");
    for (const table of ["teams", "Players", "Matches", "estadisticas_jugadores"]) {
      ch.on("postgres_changes", { event: "*", schema: "public", table }, reload);
    }
    ch.subscribe();

    return () => {
      alive = false;
      clearTimeout(timer);
      supabase.removeChannel(ch);
    };
  }, []);

  return { categories: cats, source };
}