// Utilidad de prueba (Ronda 20): ejecuta un módulo del navegador en un proceso Node aparte con
// `globalThis.process = undefined`, para demostrar que el módulo no depende de Node.
// El cuerpo recibe el módulo importado y debe devolver un valor serializable en JSON.
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export function runWithoutProcess(modulePath, body, extraModules = {}) {
  const imports = Object.entries(extraModules)
    .map(([name, p]) => `const ${name} = await import(${JSON.stringify(pathToFileURL(p).href)});`)
    .join("\n");
  const script = `
const out = globalThis.process.stdout;
globalThis.process = undefined;
const m = await import(${JSON.stringify(pathToFileURL(modulePath).href)});
${imports}
const result = await (${body})(m);
out.write(JSON.stringify({ processType: typeof process, result }));
`;
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
    encoding: "utf8",
    timeout: 60000,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (child.status !== 0) {
    throw new Error(`El módulo falló sin process: ${child.stderr || child.stdout}`);
  }
  return JSON.parse(child.stdout);
}

