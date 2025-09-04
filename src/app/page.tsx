"use client";
import React, { useMemo, useState, useEffect } from "react";
import wines from "@/data/wines.json";

// === 型定義 ===
type AnswerDetail = {
  correct: string[];
  note?: string;
};

type WineProfile = {
  id: string;
  grape: string;
  region: string;
  vintageHint: string;
  isRed: boolean;
  notes?: string;
  answers: Record<string, AnswerDetail | undefined>; // ← 修正
};

// === データ ===
// === データ ===
// まずは unknown 経由で受ける
const RAW_WINES = wines as unknown as any[];

// JSONのばらつきを吸収して WineProfile に正規化
const ARCHETYPES: WineProfile[] = RAW_WINES.map((w) => {
  const rawAnswers = (w.answers ?? {}) as Record<string, any>;

  const safeAnswers: Record<string, AnswerDetail | undefined> = {};
  Object.entries(rawAnswers).forEach(([key, val]) => {
    if (!val) return;
    // 期待形：{ correct: string[], note?: string }
    if (Array.isArray(val.correct)) {
      safeAnswers[key] = { correct: val.correct as string[], note: val.note };
      return;
    }
    // 旧形対応：["A","B"] の配列だけ入っている場合も拾う
    if (Array.isArray(val)) {
      safeAnswers[key] = { correct: val as string[] };
      return;
    }
  });

  const normalized: WineProfile = {
    id: w.id,
    grape: w.grape,
    region: w.region,
    vintageHint: w.vintageHint,
    isRed: Boolean(w.isRed),
    notes: w.notes,
    answers: safeAnswers,
  };
  return normalized;
});
const ORDER = [
  "清澄度",
  "輝き",
  "色調",
  "濃淡",
  "粘性",
  "外観の印象",
  "香り:第一印象",
  "香り:特徴/果実",
  "香り:特徴/花",
  "香り:特徴/植物",
  "香り:特徴/香辛料-芳香-化学物",
  "香りの印象",
  "味わい:アタック",
  "味わい:甘み",
  "味わい:酸味",
  "味わい:苦味",
  "味わい:タンニン分",
  "味わい:バランス",
  "味わい:アルコール",
  "味わい:余韻",
  "評価",
  "適正温度",
  "グラス",
  "デカンタージュ",
];

// === カテゴリ別全選択肢 ===
const ALL_OPTIONS: Record<string, string[]> = {};
ARCHETYPES.forEach((w) => {
  Object.entries(w.answers).forEach(([cat, detail]) => {
    if (!detail) return; // ★ これを追加（undefined ガード）
    if (!ALL_OPTIONS[cat]) ALL_OPTIONS[cat] = [];
    detail.correct.forEach((c) => {
      if (!ALL_OPTIONS[cat].includes(c)) ALL_OPTIONS[cat].push(c);
    });
  });
});

// === ユーティリティ ===
function toDetail(obj?: AnswerDetail): AnswerDetail {
  if (!obj) return { correct: [] };
  return obj;
}

// === QuizGroup コンポーネント ===
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
    <div className="bg-white rounded-xl shadow p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold">{title}</h2>
          {!revealed && showCountHint && score.total > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
              正解数: {score.total}
            </span>
          )}
        </div>
        {revealed ? (
          <div className="text-xs text-neutral-500">
            正解 {score.ok}/{score.total}
          </div>
        ) : (
          <button
            onClick={onRevealCategory}
            className="text-xs px-2 py-1 rounded bg-neutral-800 text-white"
          >
            このカテゴリを採点
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isPicked = picked.has(opt);
          let color = "bg-neutral-100";
          if (revealed) {
            if (correctSet.has(opt) && isPicked) {
              color = "bg-green-500 text-white";
            } else if (correctSet.has(opt) && !isPicked) {
              color = "border border-green-500";
            } else if (!correctSet.has(opt) && isPicked) {
              color = "bg-red-500 text-white";
            }
          } else {
            if (isPicked) color = "bg-blue-500 text-white";
          }

          return (
            <button
              key={opt}
              onClick={() => onToggle(opt)}
              className={`px-3 py-1 rounded-lg text-sm ${color}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {revealed && correctDetail.note && (
        <p className="mt-2 text-xs text-neutral-600">解説: {correctDetail.note}</p>
      )}
    </div>
  );
}

// === メインコンポーネント ===
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
        <p className="text-neutral-600 text-sm mt-1">
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

        <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="inline-flex rounded-lg overflow-hidden border">
            <button
              className={`px-3 py-1 text-sm ${mode === "random" ? "bg-black text-white" : "bg-white"}`}
              onClick={() => setMode("random")}
            >
              ランダム
            </button>
            <button
              className={`px-3 py-1 text-sm ${mode === "manual" ? "bg-black text-white" : "bg-white"}`}
              onClick={() => setMode("manual")}
            >
              手動選択
            </button>
          </div>

          {mode === "manual" && (
            <select
              className="border rounded-lg px-3 py-2 text-sm w-full sm:w-[420px]"
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

      <div className="bg-neutral-50 p-4 rounded-lg">
        <p className="text-sm text-neutral-700">
          <strong>品種:</strong> {wine.grape}｜<strong>地域:</strong> {wine.region}｜
          <strong>ヴィンテージ目安:</strong> {wine.vintageHint}
        </p>
        {wine.notes && (
          <p className="mt-1 text-xs text-neutral-500">解説: {wine.notes}</p>
        )}
      </div>

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

      <div className="flex gap-3">
        <button
          onClick={() => setRevealed(true)}
          className="px-4 py-2 rounded bg-black text-white"
        >
          全カテゴリを採点
        </button>
        <button
          onClick={nextWine}
          className="px-4 py-2 rounded bg-neutral-200"
        >
          次のワインへ
        </button>
      </div>
    </main>
  );
}
