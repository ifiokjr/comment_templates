/**
 * Run tests on markdown files and comments.
 *
 * ```bash
 * deno run -A scripts/test_docs.ts
 * ```
 *
 * @script
 */

import { readLines, semver } from "./deps.ts";

export async function getVersion(cwd = Deno.cwd()): Promise<string> {
  let version = "0.0.0";
  const stdout = Deno.run({ cmd: ["git", "tag"], cwd, stdout: "piped" }).stdout;

  try {
    for await (const line of readLines(stdout)) {
      const cleaned = semver.clean(line) ?? version;
      version = semver.gt(cleaned, version) ? cleaned : version;
    }
  } catch {
    // Do nothing
  }

  return version;
}

export function createTag(
  version: string,
  cwd = Deno.cwd(),
): Promise<Deno.ProcessStatus> {
  if (!semver.valid(version)) {
    throw new Error(`Invalid tag version provided: ${version}`);
  }

  // NOTE: it's important we use the -m flag to create annotated tag otherwise
  // 'git push --follow-tags' won't actually push the tags
  return Deno
    .run({ cmd: ["git", "tag", "version", "-m", version], cwd })
    .status();
}
