import { createStreaming, GlobalConfiguration } from "./deps.ts";

const globalConfig: GlobalConfiguration = {
  indentWidth: 2,
  lineWidth: 80,
};
const markdownFormatter = await createStreaming(
  fetch("https://plugins.dprint.dev/markdown-0.13.3.wasm"),
);

markdownFormatter.setConfig(globalConfig, {
  textWrap: "always",
  lineWidth: 77,
});

export function formatMarkdown(md: string): string {
  return markdownFormatter.formatText("file.md", md, {
    textWrap: "always",
    lineWidth: 77,
  });
}
