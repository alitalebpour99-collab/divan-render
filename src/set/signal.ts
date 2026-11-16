// One signal colour a series, on the ink-green and brass of Divan's war-room
// table (the owner's yes of 2026-11-16: «crimson war, amber economy, blue
// diplomacy»). On the tile the colour is the whole lower block (the dossier's
// cover, with the tile's words on it), so the page's grid reads as many
// colours and not one green; on the Reel it is the ribbon on the table's rail.
// `ink` is the colour of words on `main`.
export const SIGNAL: Record<string, { name: string; fa: string; main: string; deep: string; glow: string; ink: string }> = {
  war: { name: "crimson", fa: "سرخ جنگ", main: "#b8382e", deep: "#6a1b15", glow: "rgba(200,71,60,.34)", ink: "#fbf1e2" },
  figure: { name: "amber", fa: "کهربایی اقتصاد", main: "#e3a534", deep: "#9a6a12", glow: "rgba(230,169,63,.30)", ink: "#1d1505" },
  dilemma: { name: "steel blue", fa: "آبی دیپلماسی", main: "#2f6fae", deep: "#173e68", glow: "rgba(111,163,216,.32)", ink: "#f4f8fd" },
  versus: { name: "ivory", fa: "عاجی سنجش", main: "#efe6cf", deep: "#b9ad8c", glow: "rgba(239,230,207,.24)", ink: "#12251f" },
};
export const signalOf = (format: string) => SIGNAL[format] ?? SIGNAL.versus;
