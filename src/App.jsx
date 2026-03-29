import { useState, useMemo } from "react";

// =====================================================================
// 令和6年度介護報酬改定 単位数データ（その他地域 1単位=10円）
// =====================================================================

const CARE_LIMITS = {
  "要支援1": 5032, "要支援2": 10531,
  "要介護1": 16765, "要介護2": 19705, "要介護3": 27048,
  "要介護4": 30938, "要介護5": 36217,
};
const YOSHIEN = ["要支援1", "要支援2"];
const CARE_NUMS = [1, 2, 3, 4, 5];
const CARE_LEVEL_MAP = { "要介護1": 0, "要介護2": 1, "要介護3": 2, "要介護4": 3, "要介護5": 4, "要支援1": 0, "要支援2": 1 };

// 訪問介護
const HOUMON_KAIGO = {
  key: "訪問介護", unitLabel: "回", showFor: "kaigo",
  items: [
    { id: "hk_01", name: "身体介護 20分未満", unit: 163 },
    { id: "hk_02", name: "身体介護 20〜30分", unit: 244 },
    { id: "hk_03", name: "身体介護 30〜60分", unit: 388 },
    { id: "hk_04", name: "身体介護 60〜90分", unit: 564 },
    { id: "hk_05", name: "身体介護 90分〜（30分ごと）", unit: 83 },
    { id: "hk_06", name: "生活援助 20〜45分", unit: 179 },
    { id: "hk_07", name: "生活援助 45〜60分", unit: 220 },
    { id: "hk_08", name: "生活援助 60〜70分", unit: 261 },
    { id: "hk_09", name: "通院等乗降介助", unit: 99 },
  ],
};

// 訪問看護
const HOUMON_KANGO = {
  key: "訪問看護", unitLabel: "回", showFor: "both",
  items: [
    { id: "hkng_01", name: "訪看Ⅰ1（20分未満）", unit: 313, forKaigo: true },
    { id: "hkng_02", name: "訪看Ⅰ2（30分未満）", unit: 470, forKaigo: true },
    { id: "hkng_03", name: "訪看Ⅰ3（30〜60分）", unit: 821, forKaigo: true },
    { id: "hkng_04", name: "訪看Ⅰ4（60〜90分）", unit: 1125, forKaigo: true },
    { id: "hkng_05", name: "訪看Ⅰ5 PT等（20分）", unit: 293, forKaigo: true },
    { id: "hkng_p01", name: "予防訪看Ⅰ1（20分未満）", unit: 302, forYoshien: true },
    { id: "hkng_p02", name: "予防訪看Ⅰ2（30分未満）", unit: 450, forYoshien: true },
    { id: "hkng_p03", name: "予防訪看Ⅰ3（30〜60分）", unit: 794, forYoshien: true },
    { id: "hkng_p04", name: "予防訪看Ⅰ4（60〜90分）", unit: 1090, forYoshien: true },
    { id: "hkng_p05", name: "予防訪看Ⅰ5 PT等（20分）", unit: 284, forYoshien: true },
  ],
};

// 訪問リハビリ
const HOUMON_REHA = {
  key: "訪問リハビリ", unitLabel: "回", showFor: "both",
  items: [
    { id: "hreha_01", name: "訪問リハビリテーション費（1回）", unit: 307, forKaigo: true },
    { id: "hreha_p01", name: "介護予防訪問リハビリテーション費（1回）", unit: 307, forYoshien: true },
  ],
};

// 訪問入浴
const HOUMON_NYUYOKU = {
  key: "訪問入浴", unitLabel: "回", showFor: "both",
  items: [
    { id: "hny_01", name: "訪問入浴介護費", unit: 1279, forKaigo: true },
    { id: "hny_p01", name: "介護予防訪問入浴介護費", unit: 856, forYoshien: true },
  ],
};

// 通所介護：規模別単位数 [通常, 大規模Ⅰ, 大規模Ⅱ] × 要介護1-5
const TSUSHO_SCALE_LABELS = ["通常規模", "大規模型Ⅰ", "大規模型Ⅱ"];
const TSUSHO_TIME_BLOCKS = [
  { base: "3h", label: "3〜5時間", units: [[472, 456, 439], [541, 523, 506], [614, 595, 576], [684, 663, 641], [757, 733, 710]] },
  { base: "5h", label: "5〜7時間", units: [[671, 649, 626], [793, 768, 742], [917, 890, 861], [1040, 1008, 974], [1165, 1131, 1090]] },
  { base: "7h", label: "7〜9時間", units: [[658, 636, 614], [777, 752, 726], [900, 874, 845], [1023, 990, 958], [1148, 1113, 1076]] },
];

// 地域密着型通所介護
const CHIIKI_TSUSHO = {
  key: "地域密着型通所介護", unitLabel: "回", showFor: "kaigo",
  // careLevel → 時間区分 → 単位数
  timeBlocks: [
    { base: "3h", label: "3〜5時間", units: [562, 628, 695, 762, 829] },
    { base: "5h", label: "5〜7時間", units: [761, 875, 991, 1106, 1222] },
    { base: "7h", label: "7〜9時間", units: [752, 864, 979, 1094, 1210] },
  ],
};

// 通所リハビリ
const TSUSHO_REHA = {
  key: "通所リハビリ", unitLabel: "回", showFor: "both",
  items: [
    { id: "tr_1_1h", name: "要介護1（1〜2時間）", unit: 329, forKaigo: true, careNum: 1 },
    { id: "tr_2_1h", name: "要介護2（1〜2時間）", unit: 358, forKaigo: true, careNum: 2 },
    { id: "tr_3_1h", name: "要介護3（1〜2時間）", unit: 387, forKaigo: true, careNum: 3 },
    { id: "tr_4_1h", name: "要介護4（1〜2時間）", unit: 416, forKaigo: true, careNum: 4 },
    { id: "tr_5_1h", name: "要介護5（1〜2時間）", unit: 446, forKaigo: true, careNum: 5 },
    { id: "tr_1_3h", name: "要介護1（3〜4時間）", unit: 477, forKaigo: true, careNum: 1 },
    { id: "tr_2_3h", name: "要介護2（3〜4時間）", unit: 567, forKaigo: true, careNum: 2 },
    { id: "tr_3_3h", name: "要介護3（3〜4時間）", unit: 663, forKaigo: true, careNum: 3 },
    { id: "tr_4_3h", name: "要介護4（3〜4時間）", unit: 760, forKaigo: true, careNum: 4 },
    { id: "tr_5_3h", name: "要介護5（3〜4時間）", unit: 857, forKaigo: true, careNum: 5 },
    { id: "tr_1_6h", name: "要介護1（6〜8時間）", unit: 672, forKaigo: true, careNum: 1 },
    { id: "tr_2_6h", name: "要介護2（6〜8時間）", unit: 800, forKaigo: true, careNum: 2 },
    { id: "tr_3_6h", name: "要介護3（6〜8時間）", unit: 927, forKaigo: true, careNum: 3 },
    { id: "tr_4_6h", name: "要介護4（6〜8時間）", unit: 1077, forKaigo: true, careNum: 4 },
    { id: "tr_5_6h", name: "要介護5（6〜8時間）", unit: 1229, forKaigo: true, careNum: 5 },
    { id: "tr_p1", name: "要支援1（月額）", unit: 2268, monthly: true, forYoshien: true, careNum: 1 },
    { id: "tr_p2", name: "要支援2（月額）", unit: 4228, monthly: true, forYoshien: true, careNum: 2 },
  ],
};

// 短期入所生活介護（単独型・併設型 × 従来型個室・多床室 × 要介護1-5 + 要支援1-2）
const TANKI_SEIKATSU = {
  key: "短期入所生活介護", unitLabel: "日", showFor: "both",
  groups: [
    {
      label: "単独型・従来型個室", prefix: "tanki_s_k", forKaigo: true,
      units: [645, 715, 787, 856, 926], careNums: [1, 2, 3, 4, 5]
    },
    {
      label: "単独型・多床室", prefix: "tanki_s_t", forKaigo: true,
      units: [645, 715, 787, 856, 926], // 多床室=従来型個室と同額
      careNums: [1, 2, 3, 4, 5]
    },
    {
      label: "併設型・従来型個室", prefix: "tanki_h_k", forKaigo: true,
      units: [603, 672, 745, 815, 884], careNums: [1, 2, 3, 4, 5]
    },
    {
      label: "併設型・多床室", prefix: "tanki_h_t", forKaigo: true,
      units: [603, 672, 745, 815, 884], careNums: [1, 2, 3, 4, 5]
    },
    {
      label: "予防・単独型従来型個室", prefix: "tanki_ps_k", forYoshien: true,
      units: [479, 561], careNums: [1, 2]
    },
    {
      label: "予防・単独型多床室", prefix: "tanki_ps_t", forYoshien: true,
      units: [479, 561], careNums: [1, 2]
    },
    {
      label: "予防・併設型従来型個室", prefix: "tanki_ph_k", forYoshien: true,
      units: [451, 561], careNums: [1, 2]
    },
    {
      label: "予防・併設型多床室", prefix: "tanki_ph_t", forYoshien: true,
      units: [451, 561], careNums: [1, 2]
    },
  ],
};

// 定期巡回（一体型のみ）
const TEIKI_JUNKAI = {
  key: "定期巡回", unitLabel: "月", showFor: "kaigo",
  groups: [
    {
      label: "① 訪問看護なし（一体型）", prefix: "tj_n",
      units: [5446, 9720, 16140, 20417, 24692]
    },
    {
      label: "② 訪問看護あり（一体型）", prefix: "tj_y",
      units: [7946, 12413, 18948, 23358, 28298]
    },
  ],
};

// 静的アイテム生成（通所リハ・短期入所・定期巡回以外）
const STATIC_CATS = [HOUMON_KAIGO, HOUMON_KANGO, HOUMON_REHA, HOUMON_NYUYOKU];

// =====================================================================
// カラー
// =====================================================================
const C = {
  bg: "#0d1117", surface: "#161b22", surfaceAlt: "#1c2128",
  border: "#30363d", borderLight: "#21262d",
  text: "#e6edf3", muted: "#7d8590", dim: "#484f58",
  green: "#3fb950", greenBg: "rgba(63,185,80,0.08)", greenDim: "rgba(63,185,80,0.15)",
  orange: "#d29922",
  red: "#f85149", redBg: "rgba(248,81,73,0.1)",
  blue: "#58a6ff", blueBg: "rgba(88,166,255,0.1)",
  purple: "#a371f7", purpleBg: "rgba(163,113,247,0.1)",
  yellow: "#e3b341", yellowBg: "rgba(227,179,65,0.1)",
  teal: "#39d0d8", tealBg: "rgba(57,208,216,0.08)",
};

const btnBase = {
  width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.border}`,
  background: C.surface, color: C.muted, fontSize: 16, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center"
};

const DEF_FUKUSHI = [
  { name: "車いす", unit: "" }, { name: "電動ベッド", unit: "" }, { name: "褥瘡予防マットレス", unit: "" },
  { name: "手すり", unit: "" }, { name: "歩行器", unit: "" }, { name: "歩行補助杖", unit: "" }, { name: "", unit: "" },
];
const mkKasan = () => Array.from({ length: 10 }, () => ({ name: "", unit: "", count: "" }));
const mkOther = () => Array.from({ length: 20 }, () => ({ name: "", unit: "", count: "" }));
const mkDei = () => ({ id: Date.now(), name: "デイサービス", scale: 0, counts: {} });

// =====================================================================
// メイン
// =====================================================================
export default function App() {
  const [careLevel, setCareLevel] = useState("要介護1");
  const [activeTab, setActiveTab] = useState("訪問介護");
  const [counts, setCounts] = useState({}); // 静的サービス用
  // 通所介護：複数デイ
  const [deiList, setDeiList] = useState([{ ...mkDei(), id: 1 }]);
  // 地域密着型通所介護カウント: {`cts_${careNum}_${base}`: count}
  const [chiikiCounts, setChiikiCounts] = useState({});
  // 通所リハカウント
  const [rehaKCounts, setRehaKCounts] = useState({});
  // 短期入所カウント
  const [tankiCounts, setTankiCounts] = useState({});
  // 定期巡回カウント
  const [teikiCounts, setTeikiCounts] = useState({});
  // 福祉用具
  const [fukushi, setFukushi] = useState(DEF_FUKUSHI.map(f => ({ ...f })));
  // 加算・減算
  const [kasanMap, setKasanMap] = useState({});
  // その他
  const [otherRows, setOtherRows] = useState(mkOther());
  // 現在の単位数
  const [currentUnits, setCurrentUnits] = useState("");

  const isYoshien = YOSHIEN.includes(careLevel);
  const careNum = isYoshien
    ? (careLevel === "要支援1" ? 1 : 2)
    : parseInt(careLevel.replace("要介護", ""));
  const careIdx = careNum - 1; // 0-indexed
  const limit = CARE_LIMITS[careLevel];

  // ── タブ表示リスト ──
  const tabDefs = [
    { key: "訪問介護", showFor: "kaigo" },
    { key: "訪問看護", showFor: "both" },
    { key: "訪問リハビリ", showFor: "both" },
    { key: "訪問入浴", showFor: "both" },
    { key: "通所介護", showFor: "kaigo" },
    { key: "地域密着型通所介護", showFor: "kaigo" },
    { key: "通所リハビリ", showFor: "both" },
    { key: "短期入所生活介護", showFor: "both" },
    { key: "定期巡回", showFor: "kaigo" },
    { key: "福祉用具", showFor: "both" },
    { key: "その他", showFor: "both" },
  ];
  const visTabs = tabDefs.filter(t => {
    if (t.showFor === "both") return true;
    return t.showFor === "kaigo" && !isYoshien;
  });
  const validTab = visTabs.find(t => t.key === activeTab) ? activeTab : visTabs[0]?.key || "";

  // ── 合計計算 ──
  // 静的サービス合計
  const staticTotal = useMemo(() => {
    let s = 0;
    STATIC_CATS.forEach(cat => {
      const items = cat.showFor === "both"
        ? cat.items.filter(i => isYoshien ? i.forYoshien : i.forKaigo)
        : cat.items;
      items.forEach(svc => { s += svc.unit * (counts[svc.id] || 0); });
    });
    return s;
  }, [counts, isYoshien]);

  // 通所介護（複数デイ）合計
  const deiTotal = useMemo(() => {
    let s = 0;
    deiList.forEach(dei => {
      TSUSHO_TIME_BLOCKS.forEach(tb => {
        const id = `dei_${dei.id}_${tb.base}`;
        const cnt = dei.counts[id] || 0;
        if (cnt > 0) s += tb.units[careIdx][dei.scale] * cnt;
      });
    });
    return s;
  }, [deiList, careIdx]);

  // 地域密着型合計
  const chiikiTotal = useMemo(() => {
    let s = 0;
    CHIIKI_TSUSHO.timeBlocks.forEach(tb => {
      const id = `cts_${careNum}_${tb.base}`;
      const cnt = chiikiCounts[id] || 0;
      if (cnt > 0) s += tb.units[careIdx] * cnt;
    });
    return s;
  }, [chiikiCounts, careNum, careIdx]);

  // 通所リハ合計
  const rehaKTotal = useMemo(() => {
    let s = 0;
    TSUSHO_REHA.items.filter(i => isYoshien ? i.forYoshien : i.forKaigo).forEach(svc => {
      s += svc.unit * (rehaKCounts[svc.id] || 0);
    });
    return s;
  }, [rehaKCounts, isYoshien]);

  // 短期入所合計
  const tankiTotal = useMemo(() => {
    let s = 0;
    const grps = TANKI_SEIKATSU.groups.filter(g => isYoshien ? g.forYoshien : g.forKaigo);
    grps.forEach(g => {
      const idx2 = isYoshien ? careIdx : careIdx;
      const id = `${g.prefix}_${careNum}`;
      const cnt = tankiCounts[id] || 0;
      if (cnt > 0) {
        const uidx = g.careNums.indexOf(careNum);
        if (uidx >= 0) s += g.units[uidx] * cnt;
      }
    });
    return s;
  }, [tankiCounts, careNum, careIdx, isYoshien]);

  // 定期巡回合計
  const teikiTotal = useMemo(() => {
    let s = 0;
    TEIKI_JUNKAI.groups.forEach(g => {
      const id = `${g.prefix}_${careNum}`;
      const cnt = teikiCounts[id] || 0;
      if (cnt > 0) s += g.units[careIdx] * cnt;
    });
    return s;
  }, [teikiCounts, careNum, careIdx]);

  // 福祉用具合計
  const fukushiTotal = useMemo(() => fukushi.reduce((s, r) => s + (parseInt(r.unit) || 0), 0), [fukushi]);

  // 加算・減算合計
  const kasanTotal = useMemo(() => {
    let s = 0;
    Object.values(kasanMap).forEach(rows => {
      rows.forEach(r => {
        const u = parseInt(r.unit) || 0, c = parseInt(r.count) || 0;
        if (r.name.trim() && c !== 0) s += u * c;
      });
    });
    return s;
  }, [kasanMap]);

  // その他合計
  const otherTotal = useMemo(() => otherRows.reduce((s, r) => {
    const u = parseInt(r.unit) || 0, c = parseInt(r.count) || 0;
    return r.name.trim() && c !== 0 ? s + u * c : s;
  }, 0), [otherRows]);

  const currentNum = parseInt(currentUnits) || 0;
  const total = currentNum + staticTotal + deiTotal + chiikiTotal + rehaKTotal + tankiTotal + teikiTotal + fukushiTotal + kasanTotal + otherTotal;
  const remaining = limit - total;
  const pct = Math.min((total / limit) * 100, 100);
  const isOver = total > limit;
  const isWarn = pct >= 85 && !isOver;
  const barColor = isOver ? C.red : isWarn ? C.orange : C.green;

  // ── ヘルパー ──
  const getKasan = k => kasanMap[k] || mkKasan();
  const updKasan = (k, idx, f, v) => setKasanMap(p => {
    const rows = p[k] ? [...p[k]] : mkKasan();
    rows[idx] = { ...rows[idx], [f]: v };
    return { ...p, [k]: rows };
  });
  const getKasanTotal = k => (kasanMap[k] || []).reduce((s, r) => {
    const u = parseInt(r.unit) || 0, c = parseInt(r.count) || 0;
    return r.name.trim() && c !== 0 ? s + u * c : s;
  }, 0);

  const tabBadge = (key) => {
    if (key === "福祉用具") return fukushiTotal + getKasanTotal("福祉用具");
    if (key === "その他") return otherTotal;
    if (key === "通所介護") return deiTotal + getKasanTotal("通所介護");
    if (key === "地域密着型通所介護") return chiikiTotal + getKasanTotal("地域密着型通所介護");
    if (key === "通所リハビリ") return rehaKTotal + getKasanTotal("通所リハビリ");
    if (key === "短期入所生活介護") return tankiTotal + getKasanTotal("短期入所生活介護");
    if (key === "定期巡回") return teikiTotal + getKasanTotal("定期巡回");
    const cat = STATIC_CATS.find(c => c.key === key);
    if (!cat) return 0;
    const items = cat.showFor === "both" ? cat.items.filter(i => isYoshien ? i.forYoshien : i.forKaigo) : cat.items;
    return items.reduce((s, svc) => s + svc.unit * (counts[svc.id] || 0), 0) + getKasanTotal(key);
  };

  const reset = () => {
    setCounts({}); setDeiList([{ ...mkDei(), id: 1 }]);
    setChiikiCounts({}); setRehaKCounts({}); setTankiCounts({}); setTeikiCounts({});
    setFukushi(DEF_FUKUSHI.map(f => ({ ...f }))); setKasanMap({});
    setOtherRows(mkOther()); setCurrentUnits("");
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: "'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", fontSize: 14
    }}>

      {/* ヘッダー */}
      <div style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: "12px 16px 10px", position: "sticky", top: 0, zIndex: 100
      }}>
        <div style={{ maxWidth: 740, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.green,
              
            < span style={{ fontSize: 11, color: C.dim }}>令和6年改定・その他地域（1単位＝10円）</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>ケアプラン 単位数シミュレーター</div>
        </div>
      </div>

      <div style={{ maxWidth: 740, margin: "0 auto", padding: "12px 12px 60px" }}>

        {/* 介護度 */}
        <div style={{
          background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`,
          padding: "12px 14px", marginBottom: 10
        }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, fontWeight: 600 }}>介護度</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {Object.keys(CARE_LIMITS).map(lv => {
              const active = careLevel === lv;
              const isYS = YOSHIEN.includes(lv);
              const ac = isYS ? C.purple : C.green, abg = isYS ? C.purpleBg : C.greenBg;
              return (
                <button key={lv} onClick={() => setCareLevel(lv)} style={{
                  padding: "6px 11px", borderRadius: 8,
                  border: `1px solid ${active ? ac : C.border}`,
                  background: active ? abg : "transparent",
                  color: active ? ac : C.muted, fontSize: 13, fontWeight: active ? 700 : 400, cursor: "pointer",
                }}>{lv}</button>
              );
            })}
          </div>
          {isYoshien && (
            <div style={{
              marginTop: 8, fontSize: 11, color: C.purple,
              background: C.purpleBg, borderRadius: 6, padding: "5px 10px"
            }}>
              介護予防サービスの単位数を表示しています
            </div>
          )}
        </div>

        {/* 現在の単位数 */}
        <div style={{
          background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`,
          padding: "12px 14px", marginBottom: 10
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 11, color: C.yellow, fontWeight: 600, marginBottom: 4 }}>現在の使用単位数（既存プラン）</div>
              <div style={{ fontSize: 11, color: C.dim }}>現在使っている単位数を入力 → 変更の試算ができます</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="number" min={0} value={currentUnits} placeholder="0"
                onChange={e => setCurrentUnits(e.target.value)}
                style={{
                  width: 130, padding: "7px 10px", background: C.bg,
                  border: `1px solid ${currentNum > 0 ? C.yellow : C.border}`,
                  borderRadius: 8, color: C.text, fontSize: 18, fontWeight: 700, textAlign: "right"
                }} />
              <span style={{ fontSize: 13, color: C.muted }}>単位</span>
              {currentNum > 0 && <button onClick={() => setCurrentUnits("")} style={{
                padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.border}`,
                background: "transparent", color: C.dim, fontSize: 11, cursor: "pointer"
              }}>クリア</button>}
            </div>
          </div>
        </div>

        {/* 合計パネル */}
        <div style={{
          background: C.surface, borderRadius: 10,
          border: `1px solid ${isOver ? C.red : isWarn ? C.orange : C.border}`,
          padding: "16px 14px", marginBottom: 10, position: "relative", overflow: "hidden"
        }}>
          {(isOver || isWarn) && <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 3,
            background: isOver ? C.red : C.orange
          }} />}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>合計単位数</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontSize: 38, fontWeight: 800, lineHeight: 1, color: isOver ? C.red : C.text }}>
                  {total.toLocaleString()}</span>
                <span style={{ fontSize: 13, color: C.muted }}>単位</span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>支給限度額</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.dim }}>
                {limit.toLocaleString()}<span style={{ fontSize: 11, color: C.dim, marginLeft: 3 }}>単位</span>
              </div>
            </div>
          </div>
          <div style={{ height: 8, background: C.bg, borderRadius: 99, overflow: "hidden", marginBottom: 8 }}>
            <div style={{
              height: "100%", width: `${pct}%`, background: barColor,
              borderRadius: 99, transition: "width 0.25s"
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span style={{ color: isOver ? C.red : isWarn ? C.orange : C.muted }}>
              {isOver ? `⚠️ 超過 ${Math.abs(remaining).toLocaleString()} 単位` : `残り ${remaining.toLocaleString()} 単位`}
            </span>
            <span style={{ color: barColor, fontWeight: 700 }}>{pct.toFixed(1)}%</span>
          </div>
          {/* 内訳 */}
          <div style={{
            marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.borderLight}`,
            display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11
          }}>
            {currentNum > 0 && <span><span style={{ color: C.dim }}>既存 </span><span style={{ color: C.yellow, fontWeight: 700 }}>{currentNum.toLocaleString()}</span></span>}
            {[
              { k: "訪問介護", v: staticTotal > 0 && HOUMON_KAIGO.items.reduce((s, i) => s + (counts[i.id] || 0) * i.unit, 0) },
              { k: "訪問看護", v: HOUMON_KANGO.items.filter(i => isYoshien ? i.forYoshien : i.forKaigo).reduce((s, i) => s + (counts[i.id] || 0) * i.unit, 0) },
              { k: "訪問リハビリ", v: HOUMON_REHA.items.filter(i => isYoshien ? i.forYoshien : i.forKaigo).reduce((s, i) => s + (counts[i.id] || 0) * i.unit, 0) },
              { k: "訪問入浴", v: HOUMON_NYUYOKU.items.filter(i => isYoshien ? i.forYoshien : i.forKaigo).reduce((s, i) => s + (counts[i.id] || 0) * i.unit, 0) },
              { k: "通所介護", v: deiTotal }, { k: "地域密着型", v: chiikiTotal },
              { k: "通所リハビリ", v: rehaKTotal }, { k: "短期入所", v: tankiTotal },
              { k: "定期巡回", v: teikiTotal }, { k: "福祉用具", v: fukushiTotal },
              { k: "加算/減算", v: kasanTotal }, { k: "その他", v: otherTotal },
            ].filter(x => x.v > 0 || x.v < 0).map(x => (
              <span key={x.k}><span style={{ color: C.dim }}>{x.k} </span>
                <span style={{ color: x.v < 0 ? C.red : C.muted, fontWeight: 700 }}>{x.v.toLocaleString()}</span>
              </span>
            ))}
          </div>
        </div>

        {/* サービス入力パネル */}
        <div style={{
          background: C.surface, borderRadius: 10,
          border: `1px solid ${C.border}`, marginBottom: 10, overflow: "hidden"
        }}>

          {/* タブ */}
          <div style={{
            display: "flex", overflowX: "auto", borderBottom: `1px solid ${C.border}`, scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch"
          }}>
            {visTabs.map(t => {
              const isActive = t.key === validTab;
              const bt = tabBadge(t.key);
              return (
                <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                  padding: "10px 10px", whiteSpace: "nowrap", flexShrink: 0,
                  background: isActive ? C.bg : "transparent", border: "none",
                  borderBottom: `2px solid ${isActive ? C.green : "transparent"}`,
                  color: isActive ? C.green : bt !== 0 ? C.blue : C.muted,
                  fontSize: 12, fontWeight: isActive ? 700 : 400, cursor: "pointer",
                }}>
                  {t.key}
                  {bt !== 0 && !isActive && (
                    <span style={{
                      marginLeft: 3, fontSize: 10, background: C.blue, color: "#fff",
                      borderRadius: 99, padding: "1px 5px"
                    }}>{bt.toLocaleString()}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── 静的サービス ── */}
          {["訪問介護", "訪問看護", "訪問リハビリ", "訪問入浴"].includes(validTab) && (() => {
            const cat = STATIC_CATS.find(c => c.key === validTab);
            if (!cat) return null;
            const items = cat.showFor === "both" ? cat.items.filter(i => isYoshien ? i.forYoshien : i.forKaigo) : cat.items;
            return (
              <div>
                {items.map((svc, i) => (
                  <SvcRow key={svc.id} svc={svc} count={counts[svc.id] || 0}
                    unitLabel={cat.unitLabel} isLast={i === items.length - 1}
                    onChange={v => setCounts(p => ({ ...p, [svc.id]: Math.max(0, v) }))} />
                ))}
                <KasanSection rows={getKasan(validTab)} total={getKasanTotal(validTab)}
                  onUpdate={(idx, f, v) => updKasan(validTab, idx, f, v)} />
              </div>
            );
          })()}

          {/* ── 通所介護（複数デイ） ── */}
          {validTab === "通所介護" && (
            <div>
              {deiList.map((dei, di) => {
                const deiSubtotal = TSUSHO_TIME_BLOCKS.reduce((s, tb) => {
                  const id = `dei_${dei.id}_${tb.base}`;
                  return s + tb.units[careIdx][dei.scale] * (dei.counts[id] || 0);
                }, 0);
                return (
                  <div key={dei.id} style={{
                    borderBottom: `1px solid ${C.border}`,
                    background: deiSubtotal > 0 ? "rgba(57,208,216,0.04)" : "transparent"
                  }}>
                    {/* デイヘッダー */}
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "10px 14px", background: C.surfaceAlt, flexWrap: "wrap"
                    }}>
                      <input type="text" value={dei.name}
                        onChange={e => setDeiList(p => p.map(d => d.id === dei.id ? { ...d, name: e.target.value } : d))}
                        style={{
                          flex: "1 1 100px", padding: "4px 8px", background: C.bg,
                          border: `1px solid ${C.border}`, borderRadius: 6,
                          color: C.text, fontSize: 13, fontWeight: 600, minWidth: 80
                        }} />
                      <div style={{ display: "flex", gap: 4 }}>
                        {TSUSHO_SCALE_LABELS.map((lb, si) => (
                          <button key={si} onClick={() => setDeiList(p => p.map(d => d.id === dei.id ? { ...d, scale: si } : d))} style={{
                            padding: "3px 8px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                            border: `1px solid ${dei.scale === si ? C.blue : C.border}`,
                            background: dei.scale === si ? C.blueBg : "transparent",
                            color: dei.scale === si ? C.blue : C.muted,
                          }}>{lb}</button>
                        ))}
                      </div>
                      {deiSubtotal > 0 && <span style={{ fontSize: 12, color: C.teal, fontWeight: 700 }}>
                        {deiSubtotal.toLocaleString()} 単位</span>}
                      {deiList.length > 1 && (
                        <button onClick={() => setDeiList(p => p.filter(d => d.id !== dei.id))} style={{
                          padding: "3px 8px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                          border: `1px solid ${C.border}`, background: "transparent", color: C.dim,
                        }}>削除</button>
                      )}
                    </div>
                    {/* 時間区分 */}
                    {TSUSHO_TIME_BLOCKS.map((tb, ti) => {
                      const id = `dei_${dei.id}_${tb.base}`;
                      const cnt = dei.counts[id] || 0;
                      const unitVal = tb.units[careIdx][dei.scale];
                      return (
                        <div key={id} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "9px 14px",
                          borderBottom: ti < TSUSHO_TIME_BLOCKS.length - 1 ? `1px solid ${C.borderLight}` : "none",
                          background: cnt > 0 ? C.greenBg : "transparent"
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 13, color: cnt > 0 ? C.text : C.muted,
                              fontWeight: cnt > 0 ? 600 : 400
                            }}>{tb.label}</div>
                            <div style={{ fontSize: 11, color: C.dim }}>
                              {unitVal.toLocaleString()} 単位/回
                              {cnt > 0 && <span style={{ color: C.green, marginLeft: 6, fontWeight: 700 }}>
                                → {(unitVal * cnt).toLocaleString()} 単位</span>}
                            </div>
                          </div>
                          <CntInput value={cnt} onChange={v => setDeiList(p => p.map(d => d.id === dei.id ? { ...d, counts: { ...d.counts, [id]: Math.max(0, v) } } : d))} />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {/* デイ追加 */}
              <div style={{ padding: "10px 14px", borderTop: `1px solid ${C.border}` }}>
                <button onClick={() => setDeiList(p => [...p, { ...mkDei(), id: Date.now() }])} style={{
                  padding: "7px 14px", borderRadius: 7, border: `1px dashed ${C.teal}`,
                  background: "transparent", color: C.teal, fontSize: 12, cursor: "pointer",
                }}>＋ デイサービスを追加</button>
              </div>
              <KasanSection rows={getKasan("通所介護")} total={getKasanTotal("通所介護")}
                onUpdate={(idx, f, v) => updKasan("通所介護", idx, f, v)} />
            </div>
          )}

          {/* ── 地域密着型通所介護 ── */}
          {validTab === "地域密着型通所介護" && (
            <div>
              {CHIIKI_TSUSHO.timeBlocks.map((tb, i) => {
                const id = `cts_${careNum}_${tb.base}`;
                const cnt = chiikiCounts[id] || 0;
                const unitVal = tb.units[careIdx];
                return (
                  <div key={id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px",
                    borderBottom: i < CHIIKI_TSUSHO.timeBlocks.length - 1 ? `1px solid ${C.borderLight}` : "none",
                    background: cnt > 0 ? C.greenBg : "transparent"
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: cnt > 0 ? C.text : C.muted, fontWeight: cnt > 0 ? 600 : 400 }}>
                        {careLevel}（{tb.label}）</div>
                      <div style={{ fontSize: 11, color: C.dim }}>
                        {unitVal.toLocaleString()} 単位/回
                        {cnt > 0 && <span style={{ color: C.green, marginLeft: 6, fontWeight: 700 }}>→ {(unitVal * cnt).toLocaleString()} 単位</span>}
                      </div>
                    </div>
                    <CntInput value={cnt} onChange={v => setChiikiCounts(p => ({ ...p, [id]: Math.max(0, v) }))} />
                  </div>
                );
              })}
              <KasanSection rows={getKasan("地域密着型通所介護")} total={getKasanTotal("地域密着型通所介護")}
                onUpdate={(idx, f, v) => updKasan("地域密着型通所介護", idx, f, v)} />
            </div>
          )}

          {/* ── 通所リハビリ ── */}
          {validTab === "通所リハビリ" && (
            <div>
              {TSUSHO_REHA.items.filter(i => isYoshien ? i.forYoshien : i.forKaigo)
                .filter(i => isYoshien || i.careNum === careNum)
                .map((svc, idx, arr) => (
                  <SvcRow key={svc.id} svc={svc} count={rehaKCounts[svc.id] || 0}
                    unitLabel={svc.monthly ? "月" : "回"} isLast={idx === arr.length - 1}
                    onChange={v => setRehaKCounts(p => ({ ...p, [svc.id]: Math.max(0, v) }))} />
                ))}
              <KasanSection rows={getKasan("通所リハビリ")} total={getKasanTotal("通所リハビリ")}
                onUpdate={(idx, f, v) => updKasan("通所リハビリ", idx, f, v)} />
            </div>
          )}

          {/* ── 短期入所生活介護 ── */}
          {validTab === "短期入所生活介護" && (
            <div>
              {TANKI_SEIKATSU.groups.filter(g => isYoshien ? g.forYoshien : g.forKaigo).map((g, gi, ga) => {
                const uidx = g.careNums.indexOf(careNum);
                if (uidx < 0) return null;
                const unitVal = g.units[uidx];
                const id = `${g.prefix}_${careNum}`;
                const cnt = tankiCounts[id] || 0;
                return (
                  <div key={g.prefix} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px",
                    borderBottom: gi < ga.length - 1 ? `1px solid ${C.borderLight}` : "none",
                    background: cnt > 0 ? C.greenBg : "transparent"
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: cnt > 0 ? C.text : C.muted, fontWeight: cnt > 0 ? 600 : 400 }}>
                        {g.label}（{careLevel}）</div>
                      <div style={{ fontSize: 11, color: C.dim }}>
                        {unitVal.toLocaleString()} 単位/日
                        {cnt > 0 && <span style={{ color: C.green, marginLeft: 6, fontWeight: 700 }}>→ {(unitVal * cnt).toLocaleString()} 単位</span>}
                      </div>
                    </div>
                    <CntInput value={cnt} onChange={v => setTankiCounts(p => ({ ...p, [id]: Math.max(0, v) }))} />
                  </div>
                );
              })}
              <KasanSection rows={getKasan("短期入所生活介護")} total={getKasanTotal("短期入所生活介護")}
                onUpdate={(idx, f, v) => updKasan("短期入所生活介護", idx, f, v)} />
            </div>
          )}

          {/* ── 定期巡回 ── */}
          {validTab === "定期巡回" && (
            <div>
              {TEIKI_JUNKAI.groups.map((g, gi) => {
                const id = `${g.prefix}_${careNum}`;
                const cnt = teikiCounts[id] || 0;
                const unitVal = g.units[careIdx];
                return (
                  <div key={g.prefix}>
                    <div style={{
                      padding: "8px 14px", background: C.surfaceAlt,
                      fontSize: 11, color: gi === 0 ? C.muted : C.blue, fontWeight: 600,
                      borderBottom: `1px solid ${C.borderLight}`
                    }}>{g.label}</div>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 14px",
                      borderBottom: `1px solid ${C.borderLight}`,
                      background: cnt > 0 ? C.greenBg : "transparent"
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: cnt > 0 ? C.text : C.muted, fontWeight: cnt > 0 ? 600 : 400 }}>
                          {careLevel}（月額）</div>
                        <div style={{ fontSize: 11, color: C.dim }}>
                          {unitVal.toLocaleString()} 単位/月
                          {cnt > 0 && <span style={{ color: C.green, marginLeft: 6, fontWeight: 700 }}>→ {(unitVal * cnt).toLocaleString()} 単位</span>}
                        </div>
                      </div>
                      <CntInput value={cnt} onChange={v => setTeikiCounts(p => ({ ...p, [id]: Math.max(0, v) }))} />
                    </div>
                  </div>
                );
              })}
              <KasanSection rows={getKasan("定期巡回")} total={getKasanTotal("定期巡回")}
                onUpdate={(idx, f, v) => updKasan("定期巡回", idx, f, v)} />
            </div>
          )}

          {/* ── 福祉用具 ── */}
          {validTab === "福祉用具" && (
            <div>
              <div style={{ padding: "10px 14px 4px", fontSize: 11, color: C.muted }}>
                物品名と月額単位数を入力（単位数は事業者確認のうえ入力）
              </div>
              <div style={{ display: "flex", padding: "4px 14px 5px", gap: 8 }}>
                <span style={{ flex: 1, fontSize: 11, color: C.dim }}>物品名</span>
                <span style={{ width: 90, fontSize: 11, color: C.dim, textAlign: "right" }}>月額単位数</span>
              </div>
              {fukushi.map((row, idx) => (
                <div key={idx} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "6px 14px",
                  borderTop: `1px solid ${C.borderLight}`,
                  background: (parseInt(row.unit) || 0) > 0 ? C.greenBg : "transparent"
                }}>
                  <input type="text" value={row.name} placeholder="例：特殊寝台"
                    onChange={e => setFukushi(p => { const n = [...p]; n[idx] = { ...n[idx], name: e.target.value }; return n; })}
                    style={{
                      flex: 1, padding: "6px 8px", background: C.bg,
                      border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 13
                    }} />
                  <input type="number" value={row.unit} placeholder="単位数"
                    onChange={e => setFukushi(p => { const n = [...p]; n[idx] = { ...n[idx], unit: e.target.value }; return n; })}
                    style={{
                      width: 90, padding: "6px 8px", textAlign: "right", background: C.bg,
                      border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 13, fontWeight: 700
                    }} />
                </div>
              ))}
              <div style={{ padding: "8px 14px" }}>
                <button onClick={() => setFukushi(p => [...p, { name: "", unit: "" }])} style={{
                  padding: "6px 12px", borderRadius: 7, border: `1px dashed ${C.border}`,
                  background: "transparent", color: C.muted, fontSize: 12, cursor: "pointer"
                }}>
                  ＋ 行を追加</button>
              </div>
              <KasanSection rows={getKasan("福祉用具")} total={getKasanTotal("福祉用具")}
                onUpdate={(idx, f, v) => updKasan("福祉用具", idx, f, v)} />
            </div>
          )}

          {/* ── その他 ── */}
          {validTab === "その他" && (
            <div>
              <div style={{ padding: "10px 14px 4px", fontSize: 11, color: C.muted }}>
                サービス種別がない場合に手入力。マイナス値も可（減算として計算）。
              </div>
              <div style={{ display: "flex", gap: 6, padding: "5px 14px" }}>
                <span style={{ flex: 1, fontSize: 11, color: C.dim }}>項目名</span>
                <span style={{ width: 80, fontSize: 11, color: C.dim, textAlign: "right" }}>単位数</span>
                <span style={{ width: 60, fontSize: 11, color: C.dim, textAlign: "right" }}>回数</span>
                <span style={{ width: 76, fontSize: 11, color: C.dim, textAlign: "right" }}>小計</span>
              </div>
              {otherRows.map((row, idx) => {
                const u = parseInt(row.unit) || 0, c = parseInt(row.count) || 0;
                const sub = row.name.trim() && c !== 0 ? u * c : null;
                return (
                  <div key={idx} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "5px 14px", borderTop: `1px solid ${C.borderLight}`,
                    background: sub === null ? "transparent" : sub > 0 ? C.greenBg : sub < 0 ? C.redBg : "transparent"
                  }}>
                    <input type="text" value={row.name} placeholder={`項目名 ${idx + 1}`}
                      onChange={e => setOtherRows(p => { const n = [...p]; n[idx] = { ...n[idx], name: e.target.value }; return n; })}
                      style={{
                        flex: 1, padding: "5px 7px", background: C.bg, border: `1px solid ${C.border}`,
                        borderRadius: 5, color: C.text, fontSize: 12
                      }} />
                    <input type="number" value={row.unit} placeholder="単位"
                      onChange={e => setOtherRows(p => { const n = [...p]; n[idx] = { ...n[idx], unit: e.target.value }; return n; })}
                      style={{
                        width: 80, padding: "5px 7px", textAlign: "right", background: C.bg,
                        border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, fontSize: 12, fontWeight: 700
                      }} />
                    <input type="number" value={row.count} placeholder="回"
                      onChange={e => setOtherRows(p => { const n = [...p]; n[idx] = { ...n[idx], count: e.target.value }; return n; })}
                      style={{
                        width: 60, padding: "5px 7px", textAlign: "right", background: C.bg,
                        border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, fontSize: 12, fontWeight: 700
                      }} />
                    <span style={{
                      width: 76, textAlign: "right", fontSize: 12, fontWeight: 700,
                      color: sub === null ? C.dim : sub > 0 ? C.green : sub < 0 ? C.red : C.dim
                    }}>
                      {sub !== null ? `${sub > 0 ? "+" : ""}${sub.toLocaleString()}` : "—"}
                    </span>
                  </div>
                );
              })}
              {otherTotal !== 0 && <div style={{
                padding: "8px 14px", borderTop: `1px solid ${C.border}`,
                display: "flex", justifyContent: "flex-end"
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: otherTotal > 0 ? C.green : C.red }}>
                  計：{otherTotal > 0 ? "+" : ""}{otherTotal.toLocaleString()} 単位</span>
              </div>}
            </div>
          )}
        </div>

        {/* リセット */}
        <button onClick={reset} style={{
          width: "100%", padding: "11px",
          background: "transparent", border: `1px solid ${C.border}`,
          borderRadius: 10, color: C.dim, fontSize: 13, cursor: "pointer", marginBottom: 16
        }}>
          リセット
        </button>

        {/* 注記 */}
        <div style={{ padding: "12px 14px", background: C.surface, borderRadius: 8, border: `1px solid ${C.border}` }}>
          <p style={{ margin: 0, fontSize: 11, color: C.dim, lineHeight: 1.9 }}>
            ⚠ 令和6年度介護報酬改定（4月・6月施行）に基づきます。地域区分は「その他」のみ対応。<br />
            通所介護は通常規模型・大規模型Ⅰ・Ⅱを複数デイ合算対応。短期入所は単独型・併設型を追加掲載。<br />
            定期巡回は一体型（訪問看護なし・あり）を掲載。介護予防通所介護は総合事業移行のため対象外。<br />
            実際の請求には公式資料をご確認ください。
          </p>
        </div>
      </div>
    </div>
  );
}

// サービス行
function SvcRow({ svc, count, unitLabel, isLast, onChange }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
      borderBottom: isLast ? "none" : `1px solid ${C.borderLight}`,
      background: count > 0 ? C.greenBg : "transparent"
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: count > 0 ? 600 : 400,
          color: count > 0 ? C.text : C.muted, lineHeight: 1.4, marginBottom: 2
        }}>{svc.name}</div>
        <div style={{ fontSize: 11, color: C.dim }}>
          {svc.unit.toLocaleString()} 単位/{svc.monthly ? "月" : unitLabel}
          {count > 0 && <span style={{ color: C.green, marginLeft: 6, fontWeight: 700 }}>
            → {(svc.unit * count).toLocaleString()} 単位</span>}
        </div>
      </div>
      <CntInput value={count} onChange={v => onChange(Math.max(0, v))} />
    </div>
  );
}

// カウント入力
function CntInput({ value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
      <button onClick={() => onChange((value || 0) - 1)} style={btnBase}>−</button>
      <input type="number" value={value || ""} placeholder="0"
        onChange={e => { const v = parseInt(e.target.value); onChange(isNaN(v) ? 0 : Math.max(0, v)); }}
        style={{
          width: 44, textAlign: "center", background: C.bg, border: `1px solid ${C.border}`,
          borderRadius: 6, color: C.text, fontSize: 14, fontWeight: 700, padding: "4px 0"
        }} />
      <button onClick={() => onChange((value || 0) + 1)} style={btnBase}>＋</button>
    </div>
  );
}

// 加算・減算セクション
function KasanSection({ rows, onUpdate, total }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: `1px solid ${C.border}` }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "9px 14px", background: C.surfaceAlt, border: "none", cursor: "pointer",
        color: C.muted, fontSize: 12
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span>{open ? "▾" : "▸"}</span>
          <span>加算・減算を入力</span>
          {total !== 0 && <span style={{
            fontSize: 11, fontWeight: 700,
            color: total > 0 ? C.green : C.red,
            background: total > 0 ? C.greenBg : C.redBg,
            borderRadius: 99, padding: "1px 7px"
          }}>
            {total > 0 ? "+" : ""}{total.toLocaleString()} 単位</span>}
        </span>
        <span style={{ fontSize: 11, color: C.dim }}>マイナス入力で減算</span>
      </button>
      {open && <div>
        <div style={{ display: "flex", gap: 6, padding: "6px 14px 4px", borderBottom: `1px solid ${C.borderLight}` }}>
          <span style={{ flex: 1, fontSize: 11, color: C.dim }}>加算・減算名</span>
          <span style={{ width: 72, fontSize: 11, color: C.dim, textAlign: "right" }}>単位数</span>
          <span style={{ width: 56, fontSize: 11, color: C.dim, textAlign: "right" }}>回数</span>
          <span style={{ width: 72, fontSize: 11, color: C.dim, textAlign: "right" }}>小計</span>
        </div>
        {rows.map((row, idx) => {
          const u = parseInt(row.unit) || 0, c = parseInt(row.count) || 0;
          const sub = row.name.trim() && c !== 0 ? u * c : null;
          return (
            <div key={idx} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 14px", borderBottom: `1px solid ${C.borderLight}`,
              background: sub === null ? "transparent" : sub > 0 ? C.greenBg : sub < 0 ? C.redBg : "transparent"
            }}>
              <input type="text" value={row.name} placeholder={`加算名 ${idx + 1}`}
                onChange={e => onUpdate(idx, "name", e.target.value)}
                style={{
                  flex: 1, padding: "5px 7px", background: C.bg, border: `1px solid ${C.border}`,
                  borderRadius: 5, color: C.text, fontSize: 12
                }} />
              <input type="number" value={row.unit} placeholder="単位"
                onChange={e => onUpdate(idx, "unit", e.target.value)}
                style={{
                  width: 72, padding: "5px 7px", textAlign: "right", background: C.bg,
                  border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, fontSize: 12, fontWeight: 700
                }} />
              <input type="number" value={row.count} placeholder="回"
                onChange={e => onUpdate(idx, "count", e.target.value)}
                style={{
                  width: 56, padding: "5px 7px", textAlign: "right", background: C.bg,
                  border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, fontSize: 12, fontWeight: 700
                }} />
              <span style={{
                width: 72, textAlign: "right", fontSize: 12, fontWeight: 700,
                color: sub === null ? C.dim : sub > 0 ? C.green : sub < 0 ? C.red : C.dim
              }}>
                {sub !== null ? `${sub > 0 ? "+" : ""}${sub.toLocaleString()}` : "—"}
              </span>
            </div>
          );
        })}
        {total !== 0 && <div style={{
          padding: "8px 14px", borderTop: `1px solid ${C.border}`,
          display: "flex", justifyContent: "flex-end"
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: total > 0 ? C.green : C.red }}>
            計：{total > 0 ? "+" : ""}{total.toLocaleString()} 単位</span>
        </div>}
      </div>}
    </div>
  );
}
