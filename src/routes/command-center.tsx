import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCircle2, Download, Flag, LineChart, Plus, Save, Sparkles, Star, Swords, Trash2, Users } from "lucide-react";
import { fetchers, qk } from "@/lib/solaria/query";
import { usePrefs } from "@/lib/solaria/store";
import { buildItemIndex, filterClassEquip } from "@/lib/solaria/equip";
import { equipScore, medianMap } from "@/lib/solaria/stats";
import { formatEta, formatGold, formatNumber } from "@/lib/solaria/format";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { bestRecommendedOffer } from "@/lib/solaria/market-intelligence";
import { ItemHotspot } from "@/components/item-modal";
import { instanceFromOffer } from "@/lib/solaria/tooltip";
import { itemLabel } from "@/lib/solaria/item-display";

export const Route = createFileRoute("/command-center")({ component: CommandCenter });

function CommandCenter() {
  const mainPlayer = usePrefs((s) => s.mainPlayer);
  const favPlayers = usePrefs((s) => s.favPlayers);
  const favGuilds = usePrefs((s) => s.favGuilds);
  const favItems = usePrefs((s) => s.favItems);
  const favBosses = usePrefs((s) => s.favBosses);
  const goals = usePrefs((s) => s.goals);
  const addGoal = usePrefs((s) => s.addGoal);
  const updateGoal = usePrefs((s) => s.updateGoal);
  const removeGoal = usePrefs((s) => s.removeGoal);
  const evolution = usePrefs((s) => s.evolution);
  const recordEvolution = usePrefs((s) => s.recordEvolution);
  const savedFilters = usePrefs((s) => s.savedFilters);
  const saveFilter = usePrefs((s) => s.saveFilter);
  const removeFilter = usePrefs((s) => s.removeFilter);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [filterName, setFilterName] = useState("");
  const [filterQuery, setFilterQuery] = useState("deals=1&sort=unit");
  const tierAlerts=usePrefs((s)=>s.tierAlerts),addTierAlert=usePrefs((s)=>s.addTierAlert),removeTierAlert=usePrefs((s)=>s.removeTierAlert);
  const [alertClass,setAlertClass]=useState("Archer"),[alertLevel,setAlertLevel]=useState("100"),[alertGold,setAlertGold]=useState("2000000");
  const playerQ = useQuery({ queryKey: qk.player(mainPlayer), queryFn: () => fetchers.player(mainPlayer), enabled: Boolean(mainPlayer) });
  const itemsQ = useQuery({ queryKey: qk.items(), queryFn: fetchers.items });
  const marketQ = useQuery({ queryKey: qk.market(), queryFn: fetchers.market });
  const bossesQ = useQuery({ queryKey: qk.bosses(), queryFn: fetchers.bosses, refetchInterval: 30_000 });
  const index = useMemo(() => itemsQ.data ? buildItemIndex(itemsQ.data) : null, [itemsQ.data]);
  const player = playerQ.data;
  const power = player ? equipScore(filterClassEquip(player.equipment, player.class || "Warrior", index)) : 0;
  useEffect(() => { if (player?.name && mainPlayer) { const previous=usePrefs.getState().evolution[mainPlayer]?.at(-1); if(previous&&((player.level??0)>previous.level||(player.gold??0)>previous.gold||power>previous.power)) toast.success("Evolução detectada",{description:`Lv ${player.level??0} · Power ${formatNumber(power)}`}); recordEvolution(mainPlayer, { level: player.level ?? 0, gold: player.gold ?? 0, power }); } }, [player, power, recordEvolution, mainPlayer]);
  const history = mainPlayer ? evolution[mainPlayer] ?? [] : [];
  const medians = useMemo(() => medianMap(marketQ.data?.offers ?? []), [marketQ.data?.offers]);
  const opportunity = bestRecommendedOffer(marketQ.data?.offers ?? [], index, player?.class, player?.level, player?.equipment, medians);
  const nextBosses = useMemo(() => (bossesQ.data?.servers ?? []).flatMap((server) => (server.upcoming ?? []).map((boss) => ({...boss, server: server.server}))).sort((a,b)=>(a.eta??Infinity)-(b.eta??Infinity)).slice(0,4), [bossesQ.data]);

  const exportData = () => {
    const rows = [["tipo", "nome", "valor"], ...favPlayers.map((name) => ["player", name, ""]), ...favGuilds.map((name) => ["guilda", name, ""]), ...favItems.map((name) => ["item", name, ""]), ...goals.map((goal) => ["meta", goal.title, `${goal.current}/${goal.target}`])];
    const blob = new Blob([rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "solaria-central.csv"; anchor.click(); URL.revokeObjectURL(url);
  };

  return <div className="space-y-4">
    <section className="rounded-lg border border-line bg-surface p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-xs font-bold uppercase tracking-wider text-teal">Centro de comando</div><h2 className="mt-1 font-display text-2xl font-semibold">Tudo que você acompanha</h2><p className="mt-1 text-sm text-mist">Watchlist, evolução, metas, filtros e exportações em um só lugar.</p></div><Button onClick={exportData}><Download className="size-4" />Exportar CSV</Button></div></section>
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel icon={Sparkles} title="Oportunidades para você">{opportunity?<div className="rounded-md border border-teal/40 bg-ink p-3"><div className="text-xs font-bold uppercase text-teal">Melhor upgrade disponível</div><ItemHotspot itemId={opportunity.rec?.id??opportunity.offer.item} instance={instanceFromOffer(opportunity.offer)} className="mt-1 block font-semibold hover:text-teal">{itemLabel(opportunity.offer.item,opportunity.rec)}</ItemHotspot><p className="mt-1 text-sm text-mist">{opportunity.advice.className} · Lv {opportunity.offer.level??"—"} · {opportunity.advice.reason}</p><div className="mt-2 font-semibold text-gold">{formatGold(opportunity.offer.gold)}</div></div>:<p className="text-sm text-mist">Defina seu personagem e aguarde os dados do mercado para receber recomendações.</p>}</Panel>
      <Panel icon={Swords} title="Próximos bosses">{nextBosses.length?<div className="space-y-2">{nextBosses.map((boss,index)=><div key={`${boss.server}-${boss.name}-${index}`} className="flex items-center justify-between rounded-md border border-line bg-ink p-3 text-sm"><span><strong>{boss.name}</strong><span className="ml-2 text-xs text-mist">{boss.server} · Lv {boss.level??"—"}</span></span><span className="font-semibold tabular-nums text-teal">{formatEta(boss.eta,bossesQ.data?.now)}</span></div>)}</div>:<p className="text-sm text-mist">Nenhum spawn previsto agora.</p>}</Panel>
      <Panel icon={Star} title="Watchlist completa"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Count label="Players" value={favPlayers.length} /><Count label="Guildas" value={favGuilds.length} /><Count label="Itens" value={favItems.length} /><Count label="Bosses" value={favBosses.length} /></div><div className="mt-3 flex flex-wrap gap-2">{favPlayers.slice(0,6).map((name)=><Link key={name} to="/players" search={{name}} className="rounded-md border border-line px-3 py-2 text-sm hover:border-teal">{name}</Link>)}{favGuilds.slice(0,4).map((name)=><Link key={name} to="/guilds" search={{name}} className="rounded-md border border-line px-3 py-2 text-sm hover:border-teal">{name}</Link>)}</div></Panel>
      <Panel icon={LineChart} title="Evolução do personagem">{player ? <><div className="grid grid-cols-3 gap-2"><Count label="Level" value={player.level ?? 0} /><Count label="Gold" value={formatGold(player.gold)} /><Count label="Power" value={formatNumber(power)} /></div><p className="mt-3 text-sm text-mist">{history.length} registros guardados. A evolução é registrada automaticamente ao visitar esta central.</p></> : <p className="text-sm text-mist">Defina seu personagem em “Meu personagem” para iniciar o histórico.</p>}</Panel>
      <Panel icon={Flag} title="Conquistas e metas"><form className="flex flex-wrap gap-2" onSubmit={(e)=>{e.preventDefault(); if(goalTitle.trim()&&Number(goalTarget)>0){addGoal(goalTitle.trim(),Number(goalTarget));setGoalTitle("");setGoalTarget("");}}}><input value={goalTitle} onChange={(e)=>setGoalTitle(e.target.value)} placeholder="Ex.: Comprar set Lv 100" className="min-h-11 min-w-40 flex-1 rounded-md border border-line bg-ink px-3"/><input type="number" min="1" value={goalTarget} onChange={(e)=>setGoalTarget(e.target.value)} placeholder="Meta" className="min-h-11 w-24 rounded-md border border-line bg-ink px-3"/><Button type="submit"><Plus className="size-4"/>Adicionar</Button></form><div className="mt-3 space-y-2">{goals.map((goal)=><div key={goal.id} className="rounded-md border border-line bg-ink p-3"><div className="flex items-center justify-between gap-2"><strong className={goal.done?"text-ok":""}>{goal.done?<CheckCircle2 className="mr-1 inline size-4"/>:null}{goal.title}</strong><button onClick={()=>removeGoal(goal.id)} aria-label="Remover meta"><Trash2 className="size-4 text-mist"/></button></div><div className="mt-2 flex items-center gap-2"><input type="range" min="0" max={goal.target} value={goal.current} onChange={(e)=>updateGoal(goal.id,Number(e.target.value))} className="flex-1"/><span className="text-xs tabular-nums text-mist">{goal.current}/{goal.target}</span></div></div>)}</div></Panel>
      <Panel icon={Save} title="Filtros salvos do Mercado"><form className="grid gap-2 sm:grid-cols-[1fr_1.5fr_auto]" onSubmit={(e)=>{e.preventDefault();if(filterName.trim()){saveFilter(filterName.trim(),filterQuery);setFilterName("");}}}><input value={filterName} onChange={(e)=>setFilterName(e.target.value)} placeholder="Nome do filtro" className="min-h-11 rounded-md border border-line bg-ink px-3"/><input value={filterQuery} onChange={(e)=>setFilterQuery(e.target.value)} placeholder="deals=1&sort=unit" className="min-h-11 rounded-md border border-line bg-ink px-3"/><Button type="submit">Salvar</Button></form><div className="mt-3 space-y-2">{savedFilters.map((filter)=><div key={filter.id} className="flex items-center gap-2 rounded-md border border-line bg-ink p-2"><a href={`/market?${filter.query}`} className="min-w-0 flex-1 truncate text-sm font-semibold hover:text-teal">{filter.name}</a><button onClick={()=>removeFilter(filter.id)} aria-label="Remover filtro"><Trash2 className="size-4 text-mist"/></button></div>)}</div></Panel>
    </div>
    <section className="rounded-lg border border-line bg-surface p-4"><div className="flex items-center gap-2"><Bell className="size-4 text-teal"/><strong>Alertas por classe e tier</strong></div><form className="mt-3 grid gap-2 sm:grid-cols-4" onSubmit={(e)=>{e.preventDefault();if(Number(alertLevel)>0&&Number(alertGold)>0)addTierAlert(alertClass,Number(alertLevel),Number(alertGold));}}><select value={alertClass} onChange={e=>setAlertClass(e.target.value)} className="min-h-11 rounded-md border border-line bg-ink px-3">{["Warrior","Archer","Mage","Priest","Defense"].map(value=><option key={value}>{value}</option>)}</select><input type="number" value={alertLevel} onChange={e=>setAlertLevel(e.target.value)} placeholder="Tier" className="min-h-11 rounded-md border border-line bg-ink px-3"/><input type="number" value={alertGold} onChange={e=>setAlertGold(e.target.value)} placeholder="Preço máximo" className="min-h-11 rounded-md border border-line bg-ink px-3"/><Button type="submit">Criar alerta</Button></form><div className="mt-3 flex flex-wrap gap-2">{tierAlerts.map(alert=><span key={alert.id} className="inline-flex items-center gap-2 rounded-md border border-line bg-ink px-3 py-2 text-sm">{alert.className} · Lv {alert.level} · até {formatGold(alert.maxGold)}<button onClick={()=>removeTierAlert(alert.id)}><Trash2 className="size-3.5 text-mist"/></button></span>)}</div><p className="mt-3 text-sm text-mist">{Object.keys(usePrefs.getState().priceAlerts).length} alertas de item · notificações de boss {usePrefs.getState().bossAlerts?"ligadas":"desligadas"}.</p></section>
  </div>;
}

function Panel({icon:Icon,title,children}:{icon:typeof Users;title:string;children:React.ReactNode}){return <section className="rounded-lg border border-line bg-surface p-4"><h3 className="mb-3 flex items-center gap-2 font-semibold"><Icon className="size-4 text-teal"/>{title}</h3>{children}</section>}
function Count({label,value}:{label:string;value:string|number}){return <div className="rounded-md border border-line bg-ink p-3"><div className="text-xs text-mist">{label}</div><strong className="mt-1 block tabular-nums">{value}</strong></div>}
