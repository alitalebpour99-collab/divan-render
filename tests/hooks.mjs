import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const isFile = (p) => existsSync(p) && statSync(p).isFile();

export async function resolve(specifier, context, next) {
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
    const target = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    for (const c of [target, `${target}.ts`, `${target}.tsx`, path.join(target, "index.ts")]) if (isFile(c)) return { url: pathToFileURL(c).href, shortCircuit: true };
  }
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (url.startsWith("file:") && url.endsWith(".json")) return { format: "module", source: `export default ${readFileSync(fileURLToPath(url), "utf8")};`, shortCircuit: true };
  return next(url, context);
}
