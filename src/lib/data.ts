// Mock data generator: indexed array access is safe by construction.
// @ts-nocheck
export type Team = { id: string; name: string; short: string; color: string; logo?: string };
export type Status = "Finalitzat" | "En joc" | "Programat";
export type PlayerStat = { id: string; num: number; name: string; min: number; pts: number; t1: number; t2: number; t3: number; f: number };
export type Match = {
  id: string; round: number; date: string; time: string; venue: string; status: Status;
  home: Team; away: Team; hs?: number; as?: number; quarters?: [number, number][];
  homeStats?: PlayerStat[]; awayStats?: PlayerStat[];
};
export type Category = { id: string; name: string; teams: Team[]; matches: Match[]; rounds: number };

const CATS = [
  "U11 Mini Masculí 1r Any - Nivell A1 - Grup 02",
  "Super Copa Masculina",
  "Sènior Femení - Copa Catalunya",
  "Júnior Masculí - Preferent",
];
const CLUBS = [
  ["CB Granollers", "GRA", "oklch(0.55 0.2 25)"], ["CE Manresa", "MAN", "oklch(0.5 0.15 250)"],
  ["CB Sant Josep", "SJO", "oklch(0.6 0.17 145)"], ["Bàsquet Girona", "GIR", "oklch(0.55 0.2 15)"],
  ["CB Vic", "VIC", "oklch(0.45 0.12 280)"], ["UE Mataró", "MAT", "oklch(0.65 0.16 60)"],
  ["CB Igualada", "IGU", "oklch(0.5 0.18 200)"], ["CB Sabadell", "SAB", "oklch(0.4 0.1 250)"],
  ["Joventut Badalona", "JOV", "oklch(0.6 0.18 140)"], ["CB Terrassa", "TER", "oklch(0.55 0.15 330)"],
  ["UE Sant Andreu", "UESA", "oklch(0.55 0.2 45)"],
];
const VENUES = ["Pavelló Municipal", "Pavelló Nou", "Poliesportiu Central", "Pavelló Olímpic"];
const NAMES = ["Marc", "Pau", "Jordi", "Arnau", "Pol", "Nil", "Biel", "Èric", "Roger", "Aleix", "Joan"];
const NAMES_F = ["Laia", "Júlia", "Marta", "Ona", "Clara", "Aina", "Núria", "Mireia", "Berta", "Paula", "Queralt", "Emma"];
const SURN = ["Puig", "Vidal", "Soler", "Ferrer", "Roca", "Serra", "Font", "Mas", "Riera", "Pujol", "Bosch", "Camps"];

function rng(seed: number) { return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; }

const DORSALS = [4, 5, 7, 8, 9, 10, 11, 12, 14, 23];
function rosterName(team: Team, i: number, fem: boolean) {
  if (team.short === "UESA" && i === 4) return "Bruno Robles";
  const seed = team.name.length * 3 + Number(team.id.split("-")[1]) * 11;
  const pool = fem ? NAMES_F : NAMES;
  return `${pool[(i * 7 + seed) % 12]} ${SURN[(i * 5 + seed * 3) % 12]}`;
}
function genStats(r: () => number, total: number, fem: boolean, team: Team, mini: boolean): PlayerStat[] {
  const n = 10; const w = Array.from({ length: n }, (_, i) => r() ** 2 + 0.05 + (team.short === "UESA" && i === 4 ? 0.6 : 0));
  const sw = w.reduce((a, b) => a + b, 0);
  const pts = w.map((x) => Math.floor((x / sw) * total));
  pts[0] += total - pts.reduce((a, b) => a + b, 0);
  return pts.map((p, i) => {
    const t3 = Math.min(Math.floor(p / 3), Math.floor(r() * 4));
    const rest = p - t3 * 3;
    const t2 = Math.max(0, Math.floor(rest / 2) - Math.floor(r() * 2));
    const t1 = rest - t2 * 2;
    const min = mini ? 2 + Math.floor(r() * 5) : Math.max(4, Math.min(36, Math.round(8 + w[i] * 60 + r() * 8)));
    return { id: `${team.id}-${DORSALS[i]}`, num: DORSALS[i], name: rosterName(team, i, fem), min, pts: p, t1, t2, t3, f: Math.floor(r() * 6) };
  });
}

function build(ci: number): Category {
  const r = rng(ci * 97 + 13); const fem = CATS[ci].includes("Femen");
  const mini = ci === 0;
  const teams = CLUBS.map(([name, short, color], i) => ({ id: `${ci}-${i}`, name: mini ? `${name} ${i % 2 ? "Blau" : "Groc"}` : name, short, color }));
  const rounds = 14; const current = 12; const matches: Match[] = [];
  for (let rd = 1; rd <= rounds; rd++) {
    const order = [...teams].sort(() => r() - 0.5);
    for (let k = 0; k < 5; k++) {
      const home = order[k * 2], away = order[k * 2 + 1];
      const status: Status = rd < current ? "Finalitzat" : rd === current ? (k < 3 ? "Finalitzat" : k === 3 ? "En joc" : "Programat") : "Programat";
      const day = new Date(2026, 8, 5 + rd * 7 + (k % 2)); const m: Match = {
        id: `${ci}-${rd}-${k}`, round: rd, date: day.toLocaleDateString("ca-ES", { weekday: "short", day: "2-digit", month: "short" }),
        time: ["10:00", "11:30", "16:00", "18:15", "20:00"][k], venue: `${VENUES[k % 4]} ${home.name.split(" ").pop()}`, status, home, away,
      };
      if (status !== "Programat") {
        const nq = mini ? 8 : 4; const live = status === "En joc" ? 3 : nq;
        const base = mini ? 6 : 17; const q: [number, number][] = [];
        for (let i = 0; i < live; i++) q.push([base + Math.floor(r() * 10), base + Math.floor(r() * 10)]);
        m.quarters = q; m.hs = q.reduce((a, b) => a + b[0], 0); m.as = q.reduce((a, b) => a + b[1], 0);
        if (m.hs === m.as) { m.hs++; q[q.length - 1][0]++; }
        m.homeStats = genStats(r, m.hs, fem, home, mini); m.awayStats = genStats(r, m.as, fem, away, mini);
      }
      matches.push(m);
    }
  }
  return { id: String(ci), name: CATS[ci], teams, matches, rounds };
}

export const categories: Category[] = CATS.map((_, i) => build(i));
export const CURRENT_ROUND = 12;

export type Row = { team: Team; j: number; g: number; p: number; pf: number; pc: number; pts: number };
export function standings(c: Category): Row[] {
  const m = new Map<string, Row>(c.teams.map((t) => [t.id, { team: t, j: 0, g: 0, p: 0, pf: 0, pc: 0, pts: 0 }]));
  for (const x of c.matches) {
    if (x.status !== "Finalitzat") continue;
    if (!x.home || !x.away) continue;

    let h = m.get(x.home.id);
    if (!h) {
      h = { team: x.home, j: 0, g: 0, p: 0, pf: 0, pc: 0, pts: 0 };
      m.set(x.home.id, h);
    }
    let a = m.get(x.away.id);
    if (!a) {
      a = { team: x.away, j: 0, g: 0, p: 0, pf: 0, pc: 0, pts: 0 };
      m.set(x.away.id, a);
    }

    const hw = (x.hs ?? 0) > (x.as ?? 0);
    h.j++; a.j++; h.pf += (x.hs ?? 0); h.pc += (x.as ?? 0); a.pf += (x.as ?? 0); a.pc += (x.hs ?? 0);
    if (hw) { h.g++; a.p++; } else { a.g++; h.p++; }
  }
  // FCBQ: 2 punts victòria, 1 derrota
  const rows = [...m.values()].map((r) => ({ ...r, pts: r.g * 2 + r.p }));
  return rows.sort((a, b) => b.pts - a.pts || b.pf - b.pc - (a.pf - a.pc));
}
export type Leader = { id: string; name: string; num: number; team: Team; gp: number; pts: number; t1: number; t2: number; t3: number; f: number };
export function leaders(c: Category): Leader[] {
  const m = new Map<string, Leader>();
  for (const x of c.matches) {
    for (const [team, stats] of [[x.home, x.homeStats], [x.away, x.awayStats]] as const) {
      if (!stats) continue;
      const seenInMatch = new Set<string>();
      for (const s of stats) {
        const uniqueKey = `${s.num}-${s.name.trim().toLowerCase()}`;
        if (seenInMatch.has(uniqueKey)) continue;
        seenInMatch.add(uniqueKey);

        const globalKey = `${team.id}-${s.name.trim().toLowerCase()}`;
        const l = m.get(globalKey) ?? { id: s.id, name: s.name, num: s.num, team, gp: 0, pts: 0, t1: 0, t2: 0, t3: 0, f: 0 };
        l.gp++; 
        l.pts += s.pts; 
        l.t1 += s.t1; 
        l.t2 += s.t2; 
        l.t3 += s.t3; 
        l.f += s.f;
        m.set(globalKey, l);
      }
    }
  }
  return [...m.values()].sort((a, b) => b.pts - a.pts);
}