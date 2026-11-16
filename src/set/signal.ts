// One signal colour a series, on the ink-green and brass of Divan's war-room
// table (the owner's yes of 2026-11-16: «crimson war, amber economy, blue
// diplomacy»). It is worn by the tile (its ribbon, its seal's ring, its mark)
// and by the ribbon on the table's near rail, so the grid of the page is not
// one green and a viewer knows the series before reading a word.
export const SIGNAL: Record<string, { name: string; fa: string; main: string; deep: string; glow: string }> = {
  war: { name: "crimson", fa: "سرخ جنگ", main: "#c8473c", deep: "#6e1f19", glow: "rgba(200,71,60,.34)" },
  figure: { name: "amber", fa: "کهربایی اقتصاد", main: "#e6a93f", deep: "#7d5514", glow: "rgba(230,169,63,.30)" },
  dilemma: { name: "steel blue", fa: "آبی دیپلماسی", main: "#6fa3d8", deep: "#23466b", glow: "rgba(111,163,216,.32)" },
  versus: { name: "ivory", fa: "عاجی سنجش", main: "#efe6cf", deep: "#8d8263", glow: "rgba(239,230,207,.24)" },
};
export const signalOf = (format: string) => SIGNAL[format] ?? SIGNAL.versus;
