import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from "recharts";
import { CLASS_COLORS } from "@/lib/solaria/equip";
import type { Player } from "@/lib/solaria/types";
import { rarityName } from "@/lib/solaria/format";
import { usePrefs } from "@/lib/solaria/store";

function cssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function ClassMixBars({ data }: { data: { name: string; n: number }[] }) {
  const fill = useMemo(
    () => ({
      Warrior: cssVar("--color-class-warrior", "#f07167"),
      Archer: cssVar("--color-class-archer", "#5ee0a0"),
      Mage: cssVar("--color-class-mage", "#6eb6ff"),
      Priest: cssVar("--color-class-priest", "#e8b86d"),
      Defense: cssVar("--color-class-defense", "#b9a0ff"),
    }),
    [],
  );
  if (!data.length) return null;
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fill: "var(--color-mist)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "var(--color-mist)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: "var(--color-ink-2)", border: "1px solid var(--color-line)", borderRadius: 8 }}
            labelStyle={{ color: "var(--color-fog)" }}
          />
          <Bar dataKey="n" radius={[6, 6, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.name} fill={fill[d.name as keyof typeof fill] ?? "var(--color-teal)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RarityBars({ data }: { data: { rarity: number; n: number }[] }) {
  const lang = usePrefs((s) => s.lang);
  const colors = [
    "var(--color-r0)",
    "var(--color-r1)",
    "var(--color-r2)",
    "var(--color-r3)",
    "var(--color-r4)",
    "var(--color-r5)",
  ];
  const rows = data.map((d) => ({ ...d, label: rarityName(d.rarity, lang) }));
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ fill: "var(--color-mist)", fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "var(--color-mist)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: "var(--color-ink-2)", border: "1px solid var(--color-line)", borderRadius: 8 }}
          />
          <Bar dataKey="n" radius={[6, 6, 0, 0]}>
            {rows.map((d) => (
              <Cell key={d.rarity} fill={colors[d.rarity]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ClassRadar({ players }: { players: Player[] }) {
  const names = ["Warrior", "Archer", "Mage", "Priest", "Defense"];
  const data = names.map((name) => {
    const row: Record<string, string | number> = { class: name };
    for (const p of players) {
      row[p.name] = p.classes?.find((c) => c.name === name)?.level ?? 0;
    }
    return row;
  });
  const strokes = ["var(--color-teal)", "var(--color-gold)"];
  if (!players.length) return null;
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <RadarChart data={data}>
          <PolarGrid stroke="var(--color-line)" />
          <PolarAngleAxis dataKey="class" tick={{ fill: "var(--color-mist)", fontSize: 11 }} />
          {players.map((p, i) => (
            <Radar
              key={p.name}
              name={p.name}
              dataKey={p.name}
              stroke={strokes[i] ?? "var(--color-fog)"}
              fill={strokes[i] ?? "var(--color-fog)"}
              fillOpacity={0.18}
            />
          ))}
          <Tooltip
            contentStyle={{ background: "var(--color-ink-2)", border: "1px solid var(--color-line)", borderRadius: 8 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GoldBars({ players }: { players: Player[] }) {
  const rows = players.slice(0, 8).map((p) => ({ name: p.name, gold: p.gold ?? 0 }));
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer>
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={88}
            tick={{ fill: "var(--color-mist)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{ background: "var(--color-ink-2)", border: "1px solid var(--color-line)", borderRadius: 8 }}
          />
          <Bar dataKey="gold" fill="var(--color-gold)" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PriceHistoryChart({ points }: { points: { at: number; price: number }[] }) {
  return <div className="h-40 w-full"><ResponsiveContainer><LineChart data={points} margin={{top:8,right:8,left:0,bottom:0}}><XAxis dataKey="at" hide/><YAxis width={54} tick={{fill:"var(--color-mist)",fontSize:10}} axisLine={false} tickLine={false}/><Tooltip labelFormatter={(value)=>new Date(Number(value)).toLocaleString()} contentStyle={{background:"var(--color-ink-2)",border:"1px solid var(--color-line)",borderRadius:8}}/><Line type="monotone" dataKey="price" stroke="var(--color-teal)" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer></div>;
}

export { CLASS_COLORS };
