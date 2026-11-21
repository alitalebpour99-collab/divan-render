// node --import ./tests/register.mjs: lets plain Node read the engine's TypeScript (imports without an extension,
// JSON imported as a module). Node strips the types itself; nothing is compiled.
import { register } from "node:module";

register("./hooks.mjs", import.meta.url);
