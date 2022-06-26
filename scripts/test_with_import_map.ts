import { path } from "./deps.ts";
import { getVersion } from "./helpers.ts";

const cwd = new URL("../", import.meta.url).pathname;
const importMapPath = path.join(cwd, "tests/test_import_map.json");

try {
  const version = await getVersion();

  const importMap = {
    "imports": {
      [`https://deno.land/x/comment_templates@${version}/`]: cwd,
      "https://deno.land/x/comment_templates@<%=it.version%>/": cwd,
    },
  };

  await Deno.writeTextFile(importMapPath, JSON.stringify(importMap));
  await Deno
    .run({
      cmd: ["deno", "test", "--import-map", importMapPath, "--doc", ...[
        "mod.ts",
        "mod.d.md",
      ]],
      cwd,
    }).status();
} finally {
  await Deno.remove(importMapPath);
}
