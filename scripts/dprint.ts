import { createStreaming, GlobalConfiguration } from "./deps.ts";
import { run } from "./docs.ts";

const globalConfig: GlobalConfiguration = {
  indentWidth: 2,
  lineWidth: 80,
};
const markdownFormatter = await createStreaming(
  fetch("https://plugins.dprint.dev/markdown-0.13.3.wasm"),
);

markdownFormatter.setConfig(globalConfig, {
  semiColons: "asi",
  textWrap: "never",
});

// outputs: "const t = 5\n"
console.log(markdownFormatter.formatText("file.ts", await run()));
