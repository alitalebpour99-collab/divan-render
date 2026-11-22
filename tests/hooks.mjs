import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { transformSync } from "esbuild";

const isFile = (p) => existsSync(p) && statSync(p).isFile();

export async function resolve(specifier, context, next) {
  // the fonts load from Google at render time; under Node a frame's words are measured, never drawn
  if (specifier.startsWith("@remotion/google-fonts/")) return { url: "divan-stub:font", shortCircuit: true };
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
    const target = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    for (const c of [target, `${target}.ts`, `${target}.tsx`, path.join(target, "index.ts")]) if (isFile(c)) return { url: pathToFileURL(c).href, shortCircuit: true };
  }
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (url === "divan-stub:font") return { format: "module", source: `export const loadFont = () => ({ fontFamily: "Vazirmatn" });`, shortCircuit: true };
  if (url.startsWith("file:") && url.endsWith(".json")) return { format: "module", source: `export default ${readFileSync(fileURLToPath(url), "utf8")};`, shortCircuit: true };
  // the components too (.tsx), so a test can walk a Reel frame by frame through the same functions the renderer runs
  if (url.startsWith("file:") && url.endsWith(".tsx")) {
    const { code } = transformSync(readFileSync(fileURLToPath(url), "utf8"), { loader: "tsx", jsx: "automatic", format: "esm", sourcefile: fileURLToPath(url) });
    return { format: "module", source: code, shortCircuit: true };
  }
  return next(url, context);
}
