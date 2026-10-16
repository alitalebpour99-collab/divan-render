// A post of several pictures (a carousel): the cards of one subject, 1080 by
// 1350, drawn one per frame and saved as stills. Carousels are what people save
// most on Instagram, and a saved post is shown to more people. Each card is
// whole on its own, so the post reads card by card: the hook, the ranking or
// the list, the figures, and at the end the source and why to save or send it.
// The cards wear the colour and the emblem of the series their content comes
// from. Every word and figure comes from the props the site sends.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { EMBLEM } from "./Cover";
import { Emblem } from "./emblems";
import { C, NASKH, Seal, VAZIR, paint } from "./kit";
import type { CardView, CardsProps } from "./props";

export const CARD_W = 1080;
export const CARD_H = 1350;
const PAD = 84;

export const cardsLength = (p: CardsProps) => Math.max(1, p.cards.length);

const Shell: React.FC<{ of: string; n: number; of_: number; children: React.ReactNode }> = ({ of, n, of_, children }) => (
  <AbsoluteFill style={{ background: C.bg, direction: "rtl" }}>
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${C.deep} 0%, ${C.dusk} 46%, ${C.bg} 100%)` }} />
    <AbsoluteFill style={{ background: `radial-gradient(900px 900px at 80% 20%, ${C.glow}, transparent 70%)` }} />
    <AbsoluteFill style={{ backgroundImage: `linear-gradient(${C.line} 1px, transparent 1px), linear-gradient(90deg, ${C.line} 1px, transparent 1px)`, backgroundSize: "108px 108px", opacity: 0.22 }} />
    {/* the series' emblem, large and faint, in the lower corner */}
    <div style={{ position: "absolute", left: -120, bottom: -140, opacity: 0.1 }}>
      <Emblem id={EMBLEM[of] ?? "seat"} size={720} color={C.acc} stroke={0.6} />
    </div>
    {/* whose it is, and where in the post this card stands */}
    <div style={{ position: "absolute", top: 56, right: PAD, left: PAD, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Seal size={60} word={false} />
        <span style={{ fontFamily: NASKH, fontWeight: 700, fontSize: 42, color: C.ink }}>دیوان</span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {Array.from({ length: of_ }, (_, i) => (
          <span key={i} style={{ width: i === n ? 34 : 12, height: 12, borderRadius: 6, background: i === n ? C.acc : C.line2 }} />
        ))}
      </div>
    </div>
    <div style={{ position: "absolute", top: 160, bottom: 96, right: PAD, left: PAD, display: "flex", flexDirection: "column" }}>{children}</div>
    <div style={{ position: "absolute", bottom: 40, right: PAD, left: PAD, display: "flex", justifyContent: "space-between", fontFamily: VAZIR, fontSize: 24, color: C.ink3 }}>
      <span>دوراهی‌های ایران</span>
      <span style={{ direction: "ltr", fontWeight: 700, color: C.ink2 }}>divan.ahura.cloud</span>
    </div>
  </AbsoluteFill>
);

const Hook: React.FC<{ c: Extract<CardView, { kind: "hook" }> }> = ({ c }) => (
  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", gap: 30 }}>
    <span style={{ padding: "8px 28px 12px", borderRadius: 40, background: C.acc, color: C.onAcc, fontFamily: VAZIR, fontWeight: 800, fontSize: 38 }}>{c.kicker}</span>
    {c.figure ? <div style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: c.figure.length > 10 ? 120 : 170, lineHeight: 1.05, color: C.acc }}>{c.figure}</div> : null}
    <div style={{ fontFamily: NASKH, fontWeight: 700, fontSize: c.title.length > 60 ? 70 : 84, lineHeight: 1.45, color: C.ink, textWrap: "balance" } as React.CSSProperties}>{c.title}</div>
    {c.sub ? <div style={{ fontFamily: VAZIR, fontSize: 34, lineHeight: 1.6, color: C.ink2 }}>{c.sub}</div> : null}
    <div style={{ marginTop: 10, fontFamily: VAZIR, fontWeight: 700, fontSize: 30, color: C.acc }}>ورق بزن</div>
  </div>
);

const Bars: React.FC<{ c: Extract<CardView, { kind: "bars" }> }> = ({ c }) => {
  const rows = c.rows.slice(0, 10);
  const pitch = Math.min(96, 880 / Math.max(1, rows.length));
  return (
    <>
      <div style={{ fontFamily: NASKH, fontWeight: 700, fontSize: 56, lineHeight: 1.35, color: C.ink, marginBottom: 26 }}>{c.title}</div>
      {rows.map((r, i) => (
        <div key={r.name} style={{ position: "relative", height: pitch }}>
          {r.home ? <div style={{ position: "absolute", inset: "2px -14px", borderRadius: 18, background: C.accSoft, border: `1.5px solid ${C.accLine}` }} /> : null}
          <div style={{ position: "absolute", top: pitch * 0.1, right: 4, left: 0, display: "flex", alignItems: "baseline", gap: 14, fontFamily: VAZIR }}>
            <span style={{ width: 34, flex: "none", fontWeight: 800, fontSize: 26, color: r.home ? C.acc : C.ink3 }}>{(i + 1).toLocaleString("fa-IR")}</span>
            <span style={{ flex: 1, fontWeight: r.home ? 800 : 600, fontSize: r.home ? 36 : 32, color: r.home ? C.ink : C.ink2 }}>{r.name}</span>
            <span style={{ flex: "none", fontWeight: 800, fontSize: r.home ? 36 : 30, color: r.home ? C.acc : C.ink }}>{r.text}</span>
          </div>
          <div style={{ position: "absolute", bottom: pitch * 0.12, right: 52, height: r.home ? 16 : 12, width: `${Math.max(1.5, r.share * 72)}%`, borderRadius: 8, background: r.home ? C.acc : C.ink2, opacity: r.home ? 1 : 0.42 }} />
        </div>
      ))}
      {c.note ? <div style={{ marginTop: "auto", fontFamily: VAZIR, fontSize: 26, lineHeight: 1.6, color: C.ink3 }}>{c.note}</div> : null}
    </>
  );
};

const List: React.FC<{ c: Extract<CardView, { kind: "list" }> }> = ({ c }) => {
  // one width for the figures of the whole list, from its longest, so the names start on one line
  const vw = Math.min(330, Math.max(120, Math.max(...c.items.map((it) => it.v.length)) * 22));
  return (
  <>
    <div style={{ fontFamily: NASKH, fontWeight: 700, fontSize: 56, lineHeight: 1.35, color: C.ink, marginBottom: 24 }}>{c.title}</div>
    {c.items.slice(0, 8).map((it, i) => (
      <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 22, padding: "18px 0", borderTop: `1.5px solid ${C.line}` }}>
        <span style={{ flex: "none", width: vw, fontFamily: VAZIR, fontWeight: 800, fontSize: 34, color: C.acc, whiteSpace: "nowrap" }}>{it.v}</span>
        <span style={{ flex: 1, fontFamily: VAZIR, fontSize: 32, lineHeight: 1.5, color: C.ink }}>
          {it.k}
          {it.s ? <span style={{ display: "block", fontSize: 24, color: C.ink3, marginTop: 4 }}>{it.s}</span> : null}
        </span>
      </div>
    ))}
    {c.note ? <div style={{ marginTop: "auto", fontFamily: VAZIR, fontSize: 26, lineHeight: 1.6, color: C.ink3 }}>{c.note}</div> : null}
  </>
  );
};

const Figure: React.FC<{ c: Extract<CardView, { kind: "figure" }> }> = ({ c }) => (
  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 22 }}>
    <div style={{ fontFamily: NASKH, fontWeight: 700, fontSize: 54, lineHeight: 1.4, color: C.ink2 }}>{c.label}</div>
    <div style={{ display: "flex", alignItems: "baseline", gap: 22, flexWrap: "wrap" }}>
      <span style={{ fontFamily: VAZIR, fontWeight: 800, fontSize: c.value.length > 9 ? 120 : 160, lineHeight: 1.05, color: C.acc, whiteSpace: "nowrap" }}>{c.value}</span>
      <span style={{ fontFamily: VAZIR, fontWeight: 700, fontSize: 44, color: C.ink }}>{c.unit}</span>
    </div>
    <div style={{ fontFamily: VAZIR, fontSize: 36, lineHeight: 1.7, color: C.ink }}>{c.explain}</div>
    <div style={{ fontFamily: VAZIR, fontSize: 26, lineHeight: 1.6, color: C.ink3 }}>{`${c.when} · منبع: ${c.source}`}</div>
  </div>
);

const End: React.FC<{ c: Extract<CardView, { kind: "end" }> }> = ({ c }) => (
  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 26 }}>
    <div style={{ fontFamily: NASKH, fontWeight: 700, fontSize: 66, lineHeight: 1.4, color: C.ink }}>{c.title}</div>
    {c.lines.map((l, i) => (
      <div key={i} style={{ fontFamily: VAZIR, fontSize: 30, lineHeight: 1.7, color: C.ink2 }}>{l}</div>
    ))}
    <div style={{ marginTop: 20, alignSelf: "flex-start", padding: "16px 34px 20px", borderRadius: 40, background: C.acc, color: C.onAcc, fontFamily: VAZIR, fontWeight: 800, fontSize: 38 }}>{c.cta}</div>
  </div>
);

export const Cards: React.FC<CardsProps> = (p) => {
  paint(p.of);
  const frame = useCurrentFrame();
  const n = Math.min(frame, p.cards.length - 1);
  const c = p.cards[n];
  return (
    <Shell of={p.of} n={n} of_={p.cards.length}>
      {c.kind === "hook" ? <Hook c={c} /> : c.kind === "bars" ? <Bars c={c} /> : c.kind === "list" ? <List c={c} /> : c.kind === "figure" ? <Figure c={c} /> : <End c={c} />}
    </Shell>
  );
};
