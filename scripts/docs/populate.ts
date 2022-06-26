import { commentTemplate, extractTemplateValues } from "../../mod.ts";
import { Eta, path } from "../deps.ts";
import { formatMarkdown } from "../dprint.ts";
import { getVersion } from "../helpers.ts";
import { generateApi } from "./generate-api.ts";

const cwd = new URL("../..", import.meta.url).pathname;

const promises: Array<() => Promise<void>> = [];

const files = {
  "readme.md": async () => {
    const apiDocs = await generateApi(new URL("../../mod.ts", import.meta.url));
    return { apiDocs };
  },
  "mod.ts": async () => {
    const version = await getVersion();
    const snippet = await Deno.readTextFile(path.join(cwd, "mod.d.md"));
    const map = extractTemplateValues(
      formatMarkdown(Eta.render(snippet, { version }) as string),
    );
    return Object.fromEntries(map);
  },
};

for (const [relative, promiseFn] of Object.entries(files)) {
  const file = path.join(cwd, relative);

  promises.push(async () => {
    const content = await Deno.readTextFile(file);
    const transformed = commentTemplate({
      content,
      variables: await promiseFn(),
    });
    await Deno.writeTextFile(file, transformed);
  });
}

await Promise.all(promises.map((fn) => fn()));
