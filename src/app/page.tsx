"use client";
import React, { useMemo, useState, useEffect } from "react";
// ▼ 追記済みの JSON を置き換えたらパスはそのまま、別名で置くならここを変更
import wines from "@/data/wines.json";

// === 型定義 ===
type AnswerDetail = {
  correct: string[];
  note?: string;      // 既存の「このワインの根拠」
  examTip?: string;   // ★ 追加：試験対策のヒント（JSA二次の“どれを選ぶか”指針）
};

type WineProfile = {
  id: string;
  grape: string;
  region: string;
  vintageHint: string;
  isRed: boolean;
  notes?: string;
  answers: Record<string, AnswerDetail | undefined>;
};

// === データ正規化 ===
const RAW_WINES = wines as unknown as any[];

const ARCHETYPES: WineProfile[] = RAW_WINES.map((w) => {
  const rawAnswers = (w.answers ?? {}) as Record<string, any>;
  const safeAnswers: Record<string, AnswerDetail | undefined> = {};
  Object.entries(rawAnswers).forEach(([key, val]) => {
    if (!val) return;
    if (Array.isArray(val.correct)) {
      // examTip / note はなくてもOK
      safeAnswers[key] = {
        correct: val.correct as string[],
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

  return {
    id: w.id,
    grape: w.grape,
    region: w.region,
    vintageHint: w.vintageHint,
    isRed: Boolean(w.isRed),
    notes: w.notes,
    answers: safeAnswers,
  };
});

// === 表示順 ===
const ORDER = [
  "清澄度","輝き","色調","濃淡","粘性","外観の印象",
  "香り:第一印象","香り:特徴/果実","香り:特徴/花","香り:特徴/植物","香り:特徴/香辛料-芳香-化学物","香りの印象",
  "味わい:アタック","味わい:甘み","味わい:酸味","味わい:苦味","味わい:タンニン分","味わい:バランス","味わい:アルコール","味わい:余韻",
  "評価","適正温度","グラス","デカンタージュ",
];

// === 全カテゴリの選択肢プール ===
const ALL_OPTIONS: Record<string, string[]> = {};
ARCHETYPES.forEach((w) => {
  Object.entries(w.answers).forEach(([cat, detail]) => {
    if (!detail) return;
    if (!ALL_OPTIONS[cat]) ALL_OPTIONS[cat] = [];
    detail.correct.forEach((c) => {
      if (!ALL_OPTIONS[cat].includes(c)) ALL_OPTIONS[cat].push(c);
    });
  });
});

// === util ===
function toDetail(obj?: AnswerDetail): AnswerDetail {
  if (!obj) return { correct: [] };
  return obj;
}

// === QuizGroup ===
function QuizGroup({
  title,
  options,
  picked,
  onToggle,
  correctDetail,
  revealed,
  onRevealCategory,
  showCountHint,
}: {
  title: string;
  options: string[];
  picked: Set<string>;
  onToggle: (v: string) => void;
  correctDetail: AnswerDetail;
  revealed: boolean;
  onRevealCategory: () => void;
  showCountHint: boolean;
}) {
  const correctSet = useMemo(() => new Set(correctDetail.correct), [correctDetail.correct]);

  const score = useMemo(() => {
    let ok = 0;
    correctDetail.correct.forEach((c) => {
      if (picked.has(c)) ok++;
    });
    return { ok, total: correctDetail.correct.length };
  }, [correctDetail.correct, picked]);

  return (
    <div className="rounded-xl shadow p-4 bg-white dark:bg-neutral-900">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
          {!revealed && showCountHint && score.total > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
              正解数: {score.total}
            </span>
          )}
        </div>
        {revealed ? (
          <div className="text-xs text-neutral-600 dark:text-neutral-300">
            正解 {score.ok}/{score.total}
          </div>
        ) : (
          <button
            onClick={onRevealCategory}
            className="text-xs px-2 py-1 rounded bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900"
          >
            このカテゴリを採点
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isPicked = picked.has(opt);
          let color =
            "bg-neutral-100 text-neutral-900 border border-neutral-300 " +
            "dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-600";
          if (revealed) {
            if (correctSet.has(opt) && isPicked) {
              color =
                "bg-green-600 text-white border border-green-700 " +
                "dark:bg-green-500 dark:text-black dark:border-green-600";
            } else if (correctSet.has(opt) && !isPicked) {
              color =
                "bg-white text-green-700 border border-green-700 font-semibold " +
                "dark:bg-transparent dark:text-green-300 dark:border-green-400";
            } else if (!correctSet.has(opt) && isPicked) {
              color =
                "bg-red-600 text-white border border-red-700 " +
                "dark:bg-red-500 dark:text-black dark:border-red-600";
            }
          } else {
            if (isPicked) {
              color =
                "bg-blue-600 text-white border border-blue-700 " +
                "dark:bg-blue-500 dark:text-black dark:border-blue-600";
            }
          }
          return (
            <button
              key={opt}
              onClick={() => onToggle(opt)}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${color}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {/* 採点後に「解説」を表示（note と examTip の両方） */}
      {revealed && (correctDetail.note || correctDetail.examTip) && (
        <details className="mt-3 group">
          <summary className="cursor-pointer text-sm font-semibold text-neutral-800 dark:text-neutral-100 hover:underline">
            解説（クリックで展開）
          </summary>
          <div className="mt-2 text-sm space-y-2 text-neutral-800 dark:text-neutral-200">
            {correctDetail.note && (
              <p>
                <span className="inline-block px-2 py-0.5 mr-2 rounded bg-neutral-100 dark:bg-neutral-800 text-xs">このワインの根拠</span>
                {correctDetail.note}
              </p>
            )}
            {correctDetail.examTip && (
              <p>
                <span className="inline-block px-2 py-0.5 mr-2 rounded bg-blue-100 dark:bg-blue-900 text-xs">試験対策ヒント</span>
                {correctDetail.examTip}
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

  const loadWine = (w: WineProfile) => {
    setWine(w);
    setSelected({});
    setRevealed(false);
    setRevealedByCat({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const setWineById = (id: string) => {
    const found = ARCHETYPES.find((x) => x.id === id);
    if (found) loadWine(found);
  };

  const nextWine = () => {
    if (mode === "random") {
      const w = ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)];
      loadWine(w);
    } else {
      if (selectedWineId) setWineById(selectedWineId);
    }
  };

  useEffect(() => {
    const w = ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)];
    loadWine(w);
  }, []);

  useEffect(() => {
    if (mode === "manual" && wine) setSelectedWineId(wine.id);
  }, [mode, wine]);

  const toggle = (cat: string, opt: string) => {
    setSelected((prev) => {
      const newSet = new Set(prev[cat] ?? []);
      if (newSet.has(opt)) newSet.delete(opt);
      else newSet.add(opt);
      return { ...prev, [cat]: newSet };
    });
  };

  const revealCategory = (cat: string) => {
    setRevealedByCat((prev) => ({ ...prev, [cat]: true }));
  };

  if (!wine) return <div>Loading...</div>;

  return (
    <main className="p-6 space-y-6 max-w-4xl mx-auto">
      <header className="mb-5">
        <h1 className="text-2xl font-bold">逆引きドライテイスティング・クイズ</h1>
        <p className="text-neutral-700 dark:text-neutral-300 text-sm mt-1">
          条件（品種・地域・ヴィンテージ）から全カテゴリを選択して採点。カテゴリ別採点／一括採点に対応。
        </p>

        <label className="mt-3 inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4"
            checked={showCountHint}
            onChange={(e) => setShowCountHint(e.target.checked)}
          />
          正解数ヒントを表示
        </label>

        {/* モード切替 + 手動セレクト */}
        <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="inline-flex rounded-lg overflow-hidden border border-neutral-300 bg-white
                          dark:border-neutral-700 dark:bg-neutral-900">
            {[
              { key: "random", label: "ランダム" as const },
              { key: "manual", label: "手動選択" as const },
            ].map((seg) => {
              const active = seg.key === mode;
              const base =
                "px-4 py-2 text-sm font-medium transition-colors outline-none " +
                "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black focus-visible:ring-offset-white " +
                "dark:focus-visible:ring-white dark:focus-visible:ring-offset-neutral-900";
              const activeCls = "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900";
              const inactiveCls =
                "bg-transparent text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800";
              return (
                <button
                  key={seg.key}
                  type="button"
                  aria-pressed={active}
                  className={`${base} ${active ? activeCls : inactiveCls}`}
                  onClick={() => setMode(seg.key as "random" | "manual")}
                >
                  {seg.label}
                </button>
              );
            })}
          </div>

          {mode === "manual" && (
            <select
              className="border rounded-lg px-3 py-2 text-sm w-full sm:w-[420px]
                         bg-white text-neutral-900 border-neutral-300
                         dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700"
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
        </div>
      </header>

      {/* メタ */}
      <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800">
        <p className="text-sm text-neutral-800 dark:text-neutral-100">
          <strong>品種:</strong> {wine.grape}｜<strong>地域:</strong> {wine.region}｜
          <strong>ヴィンテージ目安:</strong> {wine.vintageHint}
        </p>
        {wine.notes && (
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">解説: {wine.notes}</p>
        )}
      </div>

      {/* 本体 */}
      <div className="space-y-6">
        {ORDER.map((cat) => {
          const d = toDetail(wine.answers[cat]);
          return (
            <QuizGroup
              key={cat}
              title={cat}
              options={ALL_OPTIONS[cat] ?? []}
              picked={selected[cat] ?? new Set()}
              onToggle={(v) => toggle(cat, v)}
              correctDetail={d}
              revealed={revealed || !!revealedByCat[cat]}
              onRevealCategory={() => revealCategory(cat)}
              showCountHint={showCountHint}
            />
          );
        })}
      </div>

      {/* 主要ボタン */}
      <div className="h-24" /> {/* ← 下部固定ボタンのぶん余白を確保 */}

      {/* 画面下に固定（モバイル中心） */}
      <div className="fixed inset-x-0 bottom-0 z-50 p-3
                      bg-white/90 dark:bg-neutral-900/80 backdrop-blur
                      border-t border-neutral-200 dark:border-neutral-700
                      flex gap-3 justify-center">
        <button
          onClick={() => setRevealed(true)}
          className="px-5 py-3 rounded-lg font-semibold
                     bg-neutral-900 text-white hover:bg-neutral-800
                     dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200
                     shadow-sm border border-transparent dark:border-neutral-300
                     focus-visible:outline-none focus-visible:ring-2
                     focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white
                     dark:focus-visible:ring-white dark:focus-visible:ring-offset-neutral-900
                     transition-colors">
          全カテゴリを採点
        </button>
        <button
          onClick={nextWine}
          className="px-5 py-3 rounded-lg font-semibold
                     bg-neutral-100 text-neutral-900 hover:bg-neutral-200
                     dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700
                     border border-neutral-300 dark:border-neutral-600
                     shadow-sm
                     focus-visible:outline-none focus-visible:ring-2
                     focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white
                     dark:focus-visible:ring-white dark:focus-visible:ring-offset-neutral-900
                     transition-colors">
          次のワインへ
        </button>
      </div>
    </main>
  );
}
