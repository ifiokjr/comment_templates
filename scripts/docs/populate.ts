// deno-lint-ignore-file no-await-in-loop
import { commentTemplate } from "../../mod.ts";
import { path } from "../deps.ts";
import { generateApi } from "./generate-api.ts";

const cwd = new URL("../..", import.meta.url).pathname;
const apiDocs = await generateApi(new URL("../../mod.ts", import.meta.url));
console.log({ cwd, apiDocs });

const files = { "readme.md": { apiDocs } };

for (const [relative, variables] of Object.entries(files)) {
  const file = path.join(cwd, relative);
  const content = await Deno.readTextFile(file);
  const transformed = commentTemplate({ content, variables });

  console.log({ file }, content === transformed);
  await Deno.writeTextFile(file, transformed + "\n\nhello");
}
