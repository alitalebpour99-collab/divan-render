// The engine's type: Vazirmatn for every label (the site's own face), Noto Naskh for the words on two flags.
import { loadFont as loadVazir } from "@remotion/google-fonts/Vazirmatn";
import { loadFont as loadNaskh } from "@remotion/google-fonts/NotoNaskhArabic";

export const { fontFamily: VAZIR } = loadVazir("normal", { weights: ["500", "700", "800"], subsets: ["arabic", "latin"] });
export const { fontFamily: NASKH } = loadNaskh("normal", { weights: ["700"], subsets: ["arabic"] });
