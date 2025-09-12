"use client";
import React, { useMemo, useState, useEffect } from "react";
import wines from "@/data/wines.json";
import examOptions from "../data/exam_options";

// === 型定義 ===
type ColorMode = "white" | "red";
const colorOf = (isRed: boolean): ColorMode => (isRed ? "red" : "white");
const pickLabels = (arr?: { label: string }[]) =>
  Array.isArray(arr) ? arr.map((x) => x.label) : [];

// === 固定リスト（PDF準拠） ===
function fixedOptions(title: string, isRed: boolean): string[] | null {
  const c = colorOf(isRed);

  // 外観
  if (title === "清澄度")
    return c === "white"
      ? pickLabels(examOptions.appearance.clarityWhite)
      : pickLabels(examOptions.appearance.clarityRed);

  if (title === "輝き")
    return c === "white"
      ? pickLabels(examOptions.appearance.brillianceWhite)
      : pickLabels(examOptions.appearance.brillianceRed);

  if (title === "色調")
    return c === "white"
      ? pickLabels(examOptions.appearance.colorToneWhite)
      : pickLabels(examOptions.appearance.colorToneRed);

  if (title === "濃淡")
    return c === "white"
      ? pickLabels(examOptions.appearance.intensityWhite)
      : pickLabels(examOptions.appearance.intensityRed);

  if (title === "粘性")
    return pickLabels(examOptions.appearance.viscosity);

  // ★ 外観の印象（白赤で分岐：PDF完全一致）
  if (title === "外観の印象")
    return c === "white"
      ? pickLabels(examOptions.appearance.impressionWhite)
      : pickLabels(examOptions.appearance.impressionRed);

  // 香り
  if (title === "香り:第一印象")
    return isRed
      ? pickLabels(examOptions.aroma.firstImpressionRed)
      : pickLabels(examOptions.aroma.firstImpressionWhite);

  if (title === "香り:特徴/果実/花/植物")
    return isRed
      ? pickLabels(examOptions.aroma.features.fruitsFlowersPlantsRed)
      : pickLabels(examOptions.aroma.features.fruitsFlowersPlantsWhite);

  if (title === "香り:特徴/香辛料-芳香-化学物")
    return isRed
      ? pickLabels(examOptions.aroma.features.spicesAromaChemRed)
      : pickLabels(examOptions.aroma.features.spicesAromaChemWhite);

  // ★ 香りの印象（白赤で分岐：PDF完全一致）
  if (title === "香りの印象")
    return isRed
      ? pickLabels(examOptions.aromaImpressionRed)
      : pickLabels(examOptions.aromaImpressionWhite);

  // 味わい
  // ★ PDFの固定リストを使うカテゴリを追加
  if (title === "味わい:アタック")
    return pickLabels(examOptions.palate.attack);

  if (title === "味わい:甘み")
    return pickLabels(examOptions.palate.sweetness);

  if (title === "味わい:酸味")
    return isRed
      ? pickLabels(examOptions.palate.acidityRed)
      : pickLabels(examOptions.palate.acidityWhite);

  if (title === "味わい:苦味")
    return isRed
      ? pickLabels(examOptions.palate.bitternessRed)
      : pickLabels(examOptions.palate.bitternessWhite);

  if (title === "味わい:タンニン分")
    return isRed
      ? pickLabels(examOptions.palate.tannin)
      : []; // 白では固定候補なし（必要なら exam_options.ts で用意）

  if (title === "味わい:バランス")
    return isRed
      ? pickLabels(examOptions.palate.balanceRed)
      : pickLabels(examOptions.palate.balanceWhite);

  if (title === "味わい:アルコール")
    return isRed
      ? pickLabels(examOptions.palate.alcoholRed)
      : pickLabels(examOptions.palate.alcoholWhite);

  if (title === "味わい:余韻")
    return pickLabels(examOptions.palate.finish);

  // 評価
  // ★ PDF準拠の固定リストを利用（白赤で分岐）
  if (title === "評価")
    return isRed
      ? pickLabels(examOptions.evaluationRed)
      : pickLabels(examOptions.evaluationWhite);

  // サービング
  if (title === "適正温度")
    return isRed
      ? pickLabels(examOptions.serving.temperatureRed)
      : pickLabels(examOptions.serving.temperatureWhite);

  if (title === "グラス")
    return pickLabels(examOptions.serving.glassware);

  return null;
}


function getOptionsFor(title: string, isRed: boolean, all: Record<string, string[]>): string[] {
  const fixed = fixedOptions(title, isRed);
  if (fixed && fixed.length > 0) return Array.from(new Set(fixed));
  return Array.from(new Set(all[title] ?? []));
}

type AnswerDetail = {
  correct: string[];
  alsoAccept?: string[]; // ★ 準正解
  note?: string;
  examTip?: string;
};

type Confusion = { with: string; cues: string; pitfalls?: string };
type WineProfile = {
  id: string;
  grape: string;
  region: string;
  vintageHint: string;
  isRed: boolean;
  notes?: string;
  summary?: string;
  answers: Record<string, AnswerDetail | undefined>;
  confusions?: Confusion[];
};

// === データ正規化 ===
const RAW_WINES = wines as unknown as any[];
function unifyAromaKeys(isRed: boolean, answers: Record<string, AnswerDetail | undefined>) {
  const NEW = "香り:特徴/果実/花/植物";
  const merged = new Set<string>();
  const add = (arr?: string[]) => arr?.forEach((v) => merged.add(v));
  if (isRed) add(answers["香り:特徴/果実-花-植物"]?.correct);
  else {
    add(answers["香り:特徴/果実"]?.correct);
    add(answers["香り:特徴/花"]?.correct);
    add(answers["香り:特徴/植物"]?.correct);
  }
  if (merged.size > 0) {
    const base = answers[NEW] ?? { correct: [] };
    answers[NEW] = { ...base, correct: Array.from(new Set([...base.correct, ...merged])) };
    delete answers["香り:特徴/果実-花-植物"];
    delete answers["香り:特徴/果実"];
    delete answers["香り:特徴/花"];
    delete answers["香り:特徴/植物"];
  }
}

const ARCHETYPES: WineProfile[] = RAW_WINES.map((w) => {
  const rawAnswers = (w.answers ?? {}) as Record<string, any>;
  const safeAnswers: Record<string, AnswerDetail | undefined> = {};
  Object.entries(rawAnswers).forEach(([key, val]) => {
    if (!val) return;
        if (Array.isArray(val.correct)) {
      // ★ alsoAccept を取り込む
      const also = Array.isArray(val.alsoAccept) ? (val.alsoAccept as string[]) : undefined;
      safeAnswers[key] = {
        correct: val.correct as string[],
        alsoAccept: also,
        note: val.note,
        examTip: val.examTip,
      };
      return;
    }
    if (Array.isArray(val)) {
      safeAnswers[key] = { correct: val as string[] };
      return;
    }
  });
  unifyAromaKeys(Boolean(w.isRed), safeAnswers);
  return { id: w.id, grape: w.grape, region: w.region, vintageHint: w.vintageHint, isRed: Boolean(w.isRed), notes: w.notes, summary: w.summary, answers: safeAnswers, confusions: (w.confusions ?? []) as Confusion[] };
});

// === 表示順（PDF準拠） ===
const ORDER = [
  "清澄度","輝き","色調","濃淡","粘性","外観の印象",
  "香り:第一印象","香り:特徴/果実/花/植物","香り:特徴/香辛料-芳香-化学物","香りの印象",
  "味わい:アタック","味わい:甘み","味わい:酸味","味わい:苦味","味わい:タンニン分",
  "味わい:バランス","味わい:アルコール","味わい:余韻","評価","適正温度","グラス"
] as const;

// === 正解数ルール ===
const COUNT_RULES: Record<string, number> = {
  "色調": 2, "外観の印象": 2, "香り:第一印象": 2,
  "香り:特徴/果実/花/植物": 4, "香り:特徴/香辛料-芳香-化学物": 4, "香りの印象": 2,
};
function applyCountRule(title: string, d: AnswerDetail): AnswerDetail {
  const n = COUNT_RULES[title] ?? 1;
  return { ...d, correct: d.correct.slice(0, n) };
}

// === 全カテゴリの選択肢プール ===
const ALL_OPTIONS: Record<string, string[]> = {};
ARCHETYPES.forEach((w) => {
  Object.entries(w.answers).forEach(([cat, detail]) => {
    if (!detail) return;
    if (!ALL_OPTIONS[cat]) ALL_OPTIONS[cat] = [];
        // 正解と準正解の両方を候補に含める
    [...detail.correct, ...(detail.alsoAccept ?? [])].forEach((c) => {
      if (!ALL_OPTIONS[cat].includes(c)) ALL_OPTIONS[cat].push(c);
    });
  });
});

// === QuizGroup ===
function QuizGroup({ title, options, picked, onToggle, correctDetail, revealed, onRevealCategory, showCountHint, }: { title: string; options: string[]; picked: Set<string>; onToggle: (v: string) => void; correctDetail: AnswerDetail; revealed: boolean; onRevealCategory: () => void; showCountHint: boolean; }) {
    const correctSet = useMemo(() => new Set(correctDetail.correct), [correctDetail.correct]);
   const alsoSet = useMemo(() => new Set(correctDetail.alsoAccept ?? []), [correctDetail.alsoAccept]);
  const score = useMemo(() => { let ok = 0; correctDetail.correct.forEach((c) => { if (picked.has(c)) ok++; }); return { ok, total: correctDetail.correct.length }; }, [correctDetail.correct, picked]);
  return (
    <div className="rounded-xl shadow p-4 bg-white dark:bg-neutral-900">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
          {!revealed && showCountHint && score.total > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">正解数: {score.total}</span>
          )}
        </div>
        {revealed ? (<div className="text-xs text-neutral-600 dark:text-neutral-300">正解 {score.ok}/{score.total}</div>) : (
          <button onClick={onRevealCategory} className="text-xs px-2 py-1 rounded bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900">このカテゴリを採点</button>
        )}
      </div>
            {/* ★ 色の凡例 */}
      {revealed && (
        <div className="text-[11px] mb-2 text-neutral-600 dark:text-neutral-300">
          <span className="inline-flex items-center gap-1 mr-3">
            <span className="inline-block w-3 h-3 rounded bg-green-600 dark:bg-green-500"></span> 正解
          </span>
          <span className="inline-flex items-center gap-1 mr-3">
            <span className="inline-block w-3 h-3 rounded bg-yellow-400 dark:bg-yellow-500"></span> 準正解
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-red-600 dark:bg-red-500"></span> 誤り
          </span>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isPicked = picked.has(opt);
          let color = "bg-neutral-100 text-neutral-900 border border-neutral-300 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-600";
          if (revealed) {
   if (correctSet.has(opt) && isPicked)
     color = "bg-green-600 text-white border border-green-700 ...";
   else if (correctSet.has(opt) && !isPicked)
     color = "bg-white text-green-700 border border-green-700 font-semibold ...";
    else if (alsoSet.has(opt) && isPicked) {
   // 準正解（選択済み）→ 黄色塗り
   color =
     "bg-yellow-400 text-black border border-yellow-500 dark:bg-yellow-500 dark:text-black dark:border-yellow-600";
 } else if (alsoSet.has(opt) && !isPicked) {
   // 準正解（未選択）→ 黄色枠のみ
   color =
     "bg-white text-yellow-700 border border-yellow-500 font-semibold dark:bg-transparent dark:text-yellow-300 dark:border-yellow-400";
 } else if (!correctSet.has(opt) && !alsoSet.has(opt) && isPicked) {
   // 完全に誤り（選択済み）
   color =
     "bg-red-600 text-white border border-red-700 dark:bg-red-500 dark:text-black dark:border-red-600";
 }
 } else {
   if (isPicked)
     color = "bg-blue-600 text-white border border-blue-700 ...";
 }
          return (
            <button key={opt} onClick={() => onToggle(opt)} className={`px-3 py-1 rounded-lg text-sm transition-colors ${color}`}>{opt}</button>
          );
        })}
      </div>
      {revealed && (correctDetail.note || correctDetail.examTip || (correctDetail.alsoAccept?.length)) && (
        <details className="mt-3 group">
          <summary className="cursor-pointer text-sm font-semibold text-neutral-800 dark:text-neutral-100 hover:underline">解説（クリックで展開）</summary>
          <div className="mt-2 text-sm space-y-2 text-neutral-800 dark:text-neutral-200">
            {correctDetail.note && (<p><span className="inline-block px-2 py-0.5 mr-2 rounded bg-neutral-100 dark:bg-neutral-800 text-xs">このワインの根拠</span>{correctDetail.note}</p>)}
            {correctDetail.examTip && (<p><span className="inline-block px-2 py-0.5 mr-2 rounded bg-blue-100 dark:bg-blue-900 text-xs">試験対策ヒント</span>{correctDetail.examTip}</p>)}
                        {/* ★ 準正解の表示 */}
            {correctDetail.alsoAccept && correctDetail.alsoAccept.length > 0 && (
              <p>
                <span className="inline-block px-2 py-0.5 mr-2 rounded bg-yellow-100 dark:bg-yellow-900 text-xs text-yellow-800 dark:text-yellow-200">
                  準正解（alsoAccept）
                </span>
                {correctDetail.alsoAccept.join("／")}
              </p>
            )}
          </div>
        </details>
      )}
    </div>
  );
}

// === メイン ===
export default function Page() {
  const [wine, setWine] = useState<WineProfile | null>(null);
  const [selected, setSelected] = useState<Record<string, Set<string>>>({});
  const [revealed, setRevealed] = useState(false);
  const [revealedByCat, setRevealedByCat] = useState<Record<string, boolean>>({});
  const [showCountHint, setShowCountHint] = useState(true);
  const [mode, setMode] = useState<"random" | "manual">("random");
  const [selectedWineId, setSelectedWineId] = useState<string>("");

  const loadWine = (w: WineProfile) => { setWine(w); setSelected({}); setRevealed(false); setRevealedByCat({}); if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" }); };
  const setWineById = (id: string) => { const found = ARCHETYPES.find((x) => x.id === id); if (found) loadWine(found); };
  const nextWine = () => { if (mode === "random") { const w = ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)]; loadWine(w);} else { if (selectedWineId) setWineById(selectedWineId);} };
  useEffect(() => { const w = ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)]; loadWine(w); }, []);
  useEffect(() => { if (mode === "manual" && wine) setSelectedWineId(wine.id); }, [mode, wine]);
  const toggle = (cat: string, opt: string) => { setSelected((prev) => { const newSet = new Set(prev[cat] ?? []); if (newSet.has(opt)) newSet.delete(opt); else newSet.add(opt); return { ...prev, [cat]: newSet }; }); };
  const revealCategory = (cat: string) => { setRevealedByCat((prev) => ({ ...prev, [cat]: true })); };
  const revealAll = () => setRevealed(true);
  const resetSelections = () => { setSelected({}); setRevealed(false); setRevealedByCat({}); };

  if (!wine) return <div>Loading...</div>;
  return (
    <main className="p-6 space-y-6 max-w-4xl mx-auto">
      <header className="mb-5">
        <h1 className="text-2xl font-bold">逆引きドライテイスティング・クイズ</h1>
        <p className="text-neutral-700 dark:text-neutral-300 text-sm mt-1">条件（品種・地域・ヴィンテージ）から全カテゴリを選択して採点。カテゴリ別採点／一括採点に対応。</p>
        <label className="mt-3 inline-flex items-center gap-2 text-sm"><input type="checkbox" className="size-4" checked={showCountHint} onChange={(e) => setShowCountHint(e.target.checked)} />正解数ヒントを表示</label>
        <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="inline-flex rounded-lg overflow-hidden border border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            {[{ key: "random", label: "ランダム" as const },{ key: "manual", label: "手動選択" as const }].map((seg) => { const active = seg.key === mode; const base = "px-4 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black focus-visible:ring-offset-white dark:focus-visible:ring-white dark:focus-visible:ring-offset-neutral-900"; const activeCls = "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"; const inactiveCls = "bg-transparent text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"; return (<button key={seg.key} type="button" aria-pressed={active} className={`${base} ${active ? activeCls : inactiveCls}`} onClick={() => setMode(seg.key as "random" | "manual")}>{seg.label}</button>); })}
          </div>
          {mode === "manual" && (
  <select
    className="border rounded-lg px-3 py-2 text-sm w-full sm:w-[420px] bg-white text-neutral-900 border-neutral-300 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700"
    value={selectedWineId}
    onChange={(e) => {
      const id = e.target.value;
      setSelectedWineId(id);
      if (id) setWineById(id);
    }}
  >
    <option value="">ワインを選択...</option>

    <optgroup label="白ワイン">
      {ARCHETYPES.filter((w) => !w.isRed).map((w) => (
        <option key={w.id} value={w.id}>
          {w.region}｜{w.grape}（{w.vintageHint}）
        </option>
      ))}
    </optgroup>

    <optgroup label="赤ワイン">
      {ARCHETYPES.filter((w) => w.isRed).map((w) => (
        <option key={w.id} value={w.id}>
          {w.region}｜{w.grape}（{w.vintageHint}）
        </option>
      ))}
    </optgroup>
  </select>
)}
  </div>{/* ← ツールバーのflexコンテナを閉じる */}
      </header>

      {/* メタ情報 */}
      <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800">
        <p className="text-sm text-neutral-800 dark:text-neutral-100">
          <strong>品種:</strong> {wine.grape}｜<strong>地域:</strong> {wine.region}｜
          <strong>ヴィンテージ目安:</strong> {wine.vintageHint}
        </p>
        {wine.notes && (
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
            解説: {wine.notes}
          </p>
        )}
      </div>

      {/* 本体 */}
      <div className="space-y-6">
        {ORDER.map((cat) => {
      　    // 白ワイン: タンニン分を非表示／赤ワイン: 酸味・苦味を非表示
　　　  if (
   　　　　 (!wine.isRed && cat === "味わい:タンニン分") ||
   　　　　 (wine.isRed && (cat === "味わい:苦味"))
　　　　  ) return null;

          const key = cat as unknown as string;
          const detail = applyCountRule(
            key,
            (wine.answers[key] ?? { correct: [] }) as AnswerDetail
          );
          const opts = getOptionsFor(key, wine.isRed, ALL_OPTIONS);

          // 候補も正解もゼロならスキップ
          if (opts.length === 0 && detail.correct.length === 0) return null;

          return (
            <QuizGroup
              key={key}
              title={key}
              options={opts}
              picked={selected[key] ?? new Set()}
              onToggle={(v) => toggle(key, v)}
              correctDetail={detail}
              revealed={revealed || !!revealedByCat[key]}
              onRevealCategory={() => revealCategory(key)}
              showCountHint={showCountHint}
            />
          );
        })}
      </div>

      {/* 採点後のまとめ */}
      {revealed && wine.summary && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 shadow">
          <h3 className="font-semibold mb-1">総評</h3>
          <p className="text-sm text-neutral-800 dark:text-neutral-200">{wine.summary}</p>
        </div>
      )}

      {revealed && wine.confusions && wine.confusions.length > 0 && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 shadow">
          <h3 className="font-semibold mb-2">見分けポイント（混同しやすい相手）</h3>
          <ul className="space-y-2">
            {wine.confusions.map((c, idx) => (
              <li key={idx} className="text-sm text-neutral-800 dark:text-neutral-200">
                <span className="font-semibold">{c.with}</span>
                {": "}
                {c.cues}
                {c.pitfalls ? (
                  <span className="opacity-80">（落とし穴: {c.pitfalls}）</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* フッター操作 */}
      <div className="sticky bottom-3 mt-6 flex flex-wrap gap-2 justify-end">
        <button
          onClick={resetSelections}
          className="px-4 py-2 rounded-lg border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          やり直す
        </button>
        <button
          onClick={revealAll}
          className="px-4 py-2 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900"
        >
          全カテゴリを採点
        </button>
        <button
          onClick={nextWine}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          次のワインへ
        </button>
      </div>
    </main>
  );
}
