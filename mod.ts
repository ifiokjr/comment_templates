/**
 * Provide a string which contains template tags (using html and slash comments)
 * that should be replaced with the variables provided.
 *
 * ```md
 * <!-- ={exampleName} -->Placeholder text<!-- {/exampleName} -->
 * ```
 *
 * The above code will replace `Placeholder text` with the value of the `name`
 * variable.
 *
 * Unlike usual template formats, the wrapping comment tags are not not
 * processed by the template engine. Only the wrapped content is replaced. This
 * allows the template values to be updated continually.
 *
 * Since `html` comments don't work within markdown codeblocks you should pass
 * the full codeblock as one of the variable values. You can use pipes to make
 * sure the content is properly wrapped as a codeblock.
 *
 * ```md
 * <!-- ={sample|codeblock:"tsx"} -->|<!-- {/sample} -->
 * ```
 *
 * The above would transform the variable value of sample into a codeblock with
 * the language `tsx`.
 *
 * - `|` is used to separate the pipes.
 * - `:` is used to apply different arguments to the underlying pipe
 *   transformation.
 * - Multiple pipes can be applied to a single value.
 *
 * ```md
 * <!-- ={examplePipe|prefix:"This is a prefix"|codeblock:"tsx"|suffix:"This is a suffix"} --><!-- {/examplePipe} -->
 * ```
 *
 * The supported pipe names are.
 *
 * - `trim`: `|trim:null` trim all whitespace from the start and end of the
 *   content.
 * - `trimStart`: `|trim:null` trim all whitespace from the start of the
 *   content.
 * - `trimEnd`: `|trim:null` trim all whitespace from the end of the content.
 * - `string`: `|string:true` will wrap the value in single quotes.
 *   |string:false` will wrap the value in double quotes.
 * - `prefix`: `|prefix:"prefix"` will prefix the value with the provided
 *   string.
 * - `suffix`: `|suffix:"suffix"` will suffix the value with the provided
 *   string.
 * - `codeblock`: `|codeblock:"language"` will wrap the value in a codeblock
 *   with the provided language and set the indentation.
 * - `indent`: `|indent:"  "` will indent each line by the provided string. This
 *   can be used to provide custom prefixes like `|indent:" * "` to
 * - `code`: `|code:null` will wrap the value in inline code `\`` backticks.
 * - `replace`: `|replace:"search,replace"` will replace the search string with
 *   the replacement where the `,` is used to split the string.
 *
 * The supported pipe arguments are `true`, `false`, `null`, any number
 * `0123456789_` and any string wrapped in double quotes `"string"`
 *
 * **NOTE**: The pipe arguments are not processed with regex and at the moment
 * the regex is timing out when a single pipe is used without arguments. In
 * order to use a single pipe, please provide an argument, even if it is an
 * empty string.
 *
 * ### Examples
 *
 * ```ts
 * import { assertEquals } from './tests/deps.ts';
 * import { commentTemplate } from 'https://deno.land/x/comment-templates@0.0.0/mod.ts';
 *
 * const exampleVersion = '2.1.0';
 * const exampleName = 'Comment Template!';
 * const fileUrl = new URL('tests/fixtures/sample.md', import.meta.url);
 * const content = await Deno.readTextFile(fileUrl);
 *
 * // Transform and use the variables in the content.
 * const transformed = commentTemplate({
 *   content,
 *   variables: { exampleVersion, exampleName }
 * });
 *
 * assertEquals(
 *   transformed,
 *   `# <!-- ={exampleName} -->CommentTemplate!<!-- {/exampleName} --><!-- ={exampleVersion|prefix:"@"|code:null} -->\`@2.1.0\`<!-- {/exampleVersion} -->\n`
 * );
 * ```
 *
 * **Before:** `readme.md`
 *
 * ```md
 * # <!-- ={name} --><!-- {/name} --><!-- ={version|prefix:"@"|code:null} --><!-- {/version} -->
 * ```
 *
 * **After:** `readme.md`
 *
 * ```md
 * # <!-- ={name} -->package<!-- {/name} --><!-- ={version} -->`@2.1.0`<!-- {/version} -->
 * ```
 */
export function commentTemplate(props: CommentTemplateProps): string {
  const {
    content,
    variables,
    throwIfMissingVariable = false,
    patterns = ["slash", "xml"],
    exclude,
  } = props;
  let transformed = content;

  for (const name of patterns) {
    const pattern = PATTERNS[name];

    // Reverse the matches so that changes to content don't affect the content.
    const reversedMatches = [...transformed.matchAll(pattern)].reverse();

    for (const match of reversedMatches) {
      const full = match[0];
      const { name, value, open, close, pipes } = match.groups ?? {};
      const start = match.index;
      const length = full?.length;
      const fn = createPiper(pipes);

      if (!name || !open || !close || typeof start !== "number" || !length) {
        continue;
      }

      const end = start + length;
      const [replaceStart, replaceEnd] = [
        start + open.length,
        end - close.length,
      ];

      const variable = variables[name];
      const replacementValue = typeof variable === "string"
        ? fn(variable)
        : typeof variable === "function"
        ? fn(variable(value))
        : "";

      const details: ExcludeDetails = {
        end,
        start,
        name,
        replaceEnd,
        replaceStart,
        fullMatch: full,
        value: replacementValue,
      };

      if (exclude?.(details)) {
        continue;
      }

      // deno-lint-ignore eqeqeq
      if (variable == null) {
        if (throwIfMissingVariable) {
          throw new CommentTemplateError(`Missing variable: '${name}'`);
        }

        continue;
      }

      const before = transformed.slice(0, replaceStart);
      const after = transformed.slice(replaceEnd, transformed.length);
      transformed = `${before}${replacementValue}${after}`;
    }
  }

  return transformed;
}

const pipes = {
  trim: () => (value: string) => value.trim(),
  trimStart: () => (value: string) => value.trimStart(),
  trimEnd: () => (value: string) => value.trimEnd(),
  string: (singleQuotes = false) =>
    (value: string) => {
      const quoteType = singleQuotes ? "'" : '"';
      return `${quoteType}${value}${quoteType}`;
    },
  prefix: (prefix = "") =>
    (value: string) => {
      return `${prefix}${value}`;
    },
  suffix: (suffix = "") =>
    (value: string) => {
      return `${value}${suffix}`;
    },
  codeblock: (language = "") =>
    (value: string) => {
      return `\`\`\`${language}\n${value}\n\`\`\``;
    },
  indent: (indent = "") =>
    (value: string) => {
      return value
        .split("\n")
        .map((line) => `${indent}${line}`)
        .join("\n");
    },
  code: () =>
    (value: string) => {
      return `\`${value}\``;
    },
  replace: (value = "") => {
    const [search = "", replace = ""] = value.split(",");
    return (value: string) => {
      return value.replaceAll(search, replace);
    };
  },
};

type Piper = (value: string) => string;
interface ArgToken {
  type: "arg";
  value: string | null | number | boolean;
}
interface PipeToken {
  type: "pipe";
  name: string;
}
type Token = PipeToken | ArgToken;
const primitives = {
  null: null,
  true: true,
  false: false,
};

/**
 * The identity function for pipes.
 */
function identity(value: string) {
  return value;
}

/**
 * Combine a list of pipes into a single piper.
 */
function combine(...pipes: Piper[]) {
  return (value: string) => {
    for (const pipe of pipes) {
      value = pipe(value);
    }

    return value;
  };
}

/**
 * Create a pipe function from a pipe name and arguments.
 */
function createPiper(pipeString: string | undefined): Piper {
  const fns: Piper[] = [identity];

  if (!pipeString) {
    return combine(...fns);
  }

  let index = 0;
  const tokens: Token[] = [];
  while (index < pipeString.length) {
    const char = pipeString[index];

    if (!char) break;

    if (char === "|") {
      index++; // Skip the pipe character
      const remaining = pipeString.slice(index);
      const nextIndex = remaining.search(/[^a-z_A-Z0-9$]/);
      tokens.push({ type: "pipe", name: remaining.slice(0, nextIndex) });
      index += nextIndex;
      continue;
    }

    if (char === ":") {
      let shouldContinue = false;
      index++;

      for (const [name, value] of entries(primitives)) {
        if (pipeString.slice(index, index + name.length) !== name) {
          continue;
        }

        tokens.push({ type: "arg", value });
        index += name.length;
        shouldContinue = true;
        break;
      }

      if (shouldContinue) {
        continue;
      }

      let value = pipeString[index];

      if (!value) break;

      if (value === '"') {
        index++;
        value = pipeString.slice(index, pipeString.indexOf('"', index));
        tokens.push({ type: "arg", value });
        index += value.length + 1;
        continue;
      }

      if (/[\.0-9_]/.test(value)) {
        const remaining = pipeString.slice(index);
        const nextIndex = remaining.search(/[^\.0-9_]/);
        const value = Number(remaining.slice(0, nextIndex));
        tokens.push({ type: "arg", value });
        index += nextIndex;
        continue;
      }
    }

    index++;
  }

  let args: ArgToken["value"][] = [];
  let fn: // deno-lint-ignore no-explicit-any
    ((...args: any[]) => Piper) | undefined;

  for (const token of tokens) {
    if (token.type === "arg") {
      args.push(token.value);
      continue;
    }

    if (fn) {
      fns.push(fn(...args));
      args = [];
      fn = undefined;
    }

    if (!isPipeName(token.name)) {
      throw new CommentTemplateError(`Invalid pipe name: ${token.name}`);
    }

    fn = pipes[token.name];
  }

  if (fn) {
    fns.push(fn(...args));
  }

  return combine(...fns);
}

function isPipeName(value: string): value is keyof typeof pipes {
  return Object.keys(pipes).includes(value);
}

/**
 * This matches a variable in the markdown content and provides the following
 * named variables.
 *
 * - `open`: The opening comment tag which captures everything up to the
 *   position of the replacement content. It has the same starting index as the
 *   full match.
 * - `close`: The closing comment tag which captures everything after the
 *   position of the replacement content. It has the same ending index as the
 *   full match.
 * - `name`: The name of the variable which is reference via the `variables`
 *   passed into the markdown template function.
 * - `pipes`: A series of pipes that .
 * - `value`: The current value stored between the tags. If a function is
 *   provided it will be called with the value.
 */
const XML_COMMENT_VARIABLE =
  /(?<open><!--\s*=\{(?<name>[a-z_A-Z$][a-z_A-Z0-9$\.]*)(?<pipes>(?:\|[a-z_A-Z0-9$]+(?::(?:null|true|false|[0-9_\.]+|"[^"]*")*))*)\}\s*-->)(?<value>.*)(?<close><!--\s*\{\/\k<name>\}\s*-->)/gms;
const SLASH_COMMENT_VARIABLE =
  /(?<open>\/\*\s*=\{(?<name>[a-z_A-Z$][a-z_A-Z0-9$\.]*)(?<pipes>(?:\|[a-z_A-Z0-9$]+(?::(?:null|true|false|[0-9_\.]+|"[^"]*")))*)\}\s*\*\\)(?<value>.*)(?<close>\/\*\s*\{\/\k<name>\}\s*\*\\)/gms;

// (?:string|prefix|suffix|codeblock|indent|code|replace)

const PATTERNS = {
  /**
   * Match `<!-- ={name} --><!-- {/name} -->`
   */
  xml: XML_COMMENT_VARIABLE,
  /**
   * Match `/* ={name} *+//* {/name} *+/`
   */
  slash: SLASH_COMMENT_VARIABLE,
};

type Pattern = keyof typeof PATTERNS;

/**
 * The error that is thrown when a variable in the template doesn't exist.
 */
export class CommentTemplateError extends Error {
  /**
   * Predicate to check that the value provided is a `CommentTemplateError`.
   *
   * Useful for verifying within a `catch` block.
   *
   * ```ts
   * import { commentTemplate, CommentTemplateError } from './mod.ts';
   * const variables = { exampleValue: 'hello!' };
   *
   * try {
   *   const content = await Deno.readTextFile(new URL('readme.md', import.meta.url));
   *   commentTemplate({ content, variables, throwIfMissingVariable: true });
   * } catch (error) {
   *   if (CommentTemplateError.is(error)) {
   *    // this is an error!
   *   }
   * }
   * ```
   */
  static is(value: unknown): value is CommentTemplateError {
    return value instanceof CommentTemplateError;
  }

  constructor(message: string) {
    super(message);
  }
}

type CommentTemplateVariableFunction = (
  currentValue: string | undefined,
) => string;

interface CommentTemplateVariables {
  [name: string]: string | CommentTemplateVariableFunction;
}

/**
 * These are the props that are passed into the `commentTemplate` function.
 */
export interface CommentTemplateProps {
  /**
   * This is the content to transform and is required.
   *
   * ### Examples
   *
   * The `content` can be pulled in from a file and then written back to the
   * same file. All non-related content will be preserved.
   *
   * ```ts
   * import {
   *   commentTemplate,
   *   type CommentTemplateProps
   * } from 'https://deno.land/x/comment-templates@0.0.0/mod.ts';
   *
   * const props: CommentTemplateProps = {
   *   content: await Deno.readTextFile(new URL('tests/fixtures/sample.md', import.meta.url)),
   *   variables: { name: 'Deno' },
   * }
   *
   * const transformedContent = commentTemplate(props);
   * ```
   */
  content: string;

  /**
   * Pass variables to the template which replace the content.
   *
   * If a function is provided it is called with the current value, which can be
   * `undefined`. Variables must be a flat object structure and cannot contain nested
   * objects.
   *
   * There is currently no support for nesting.
   *
   * ### Examples
   *
   * Here is an example of creating variables with both a function and a string.
   *
   * ```ts
   * import {
   *   type CommentTemplateProps
   * } from 'https://deno.land/x/comment-templates@0.0.0/mod.ts';
   *
   * const props: CommentTemplateProps = {
   *   content: await Deno.readTextFile(new URL('tests/fixtures/sample.md', import.meta.url)),
   *   variables: {
   *     simple: 'a simple string',
   *     complex: value => value ? `${value} is complex` : 'seems undefined'
   *   },
   * }
   * ```
   */
  variables: CommentTemplateVariables;

  /**
   * Throw an error if a variable is not found. This can be useful for making
   * sure out of date comments don't clutter up your markdown and Typescript
   * files.
   *
   * @default false
   *
   * ### Examples
   *
   * This example shows how an error is thrown if a variable is not found when
   * the `throwIfMissingVariable` is set to `true`.
   *
   * ```ts
   * import { assertThrows } from 'https://deno.land/x/comment-templates@0.0.0/tests/deps.ts'
   * import {
   *   commentTemplate,
   *   type CommentTemplateProps
   * } from 'https://deno.land/x/comment-templates@0.0.0/mod.ts';
   *
   * const props: CommentTemplateProps = {
   *   content: `<!-- ={nonExistent} --><!-- {/nonExistent} -->`,
   *   variables: { name: 'Deno' },
   *   throwIfMissingVariable: true,
   * };
   *
   * assertThrows(() => commentTemplate(props)); // => true!
   * ```
   */
  throwIfMissingVariable?: boolean;

  /**
   * The comment patterns to match for the provided content. You can limit the
   * kind of comments that this function will transform.
   *
   * - `html` will be able to transform markdown files with comments.
   * - `slash` will be able to transform languages with `slash star` comments
   *   like JavaScript and TypeScript.
   *
   * @default ['html', 'slash']
   *
   * ### Examples
   *
   * ```ts
   * import { type CommentTemplateProps } from 'https://deno.land/x/comment-templates@0.0.0/mod.ts';
   *
   * const props: CommentTemplateProps = {
   *   content: `<!-- ={nonExistent} --><!-- {/nonExistent} -->`,
   *   variables: { name: 'Deno' },
   *   patterns: ['xml'], // limit to markdown files
   * };
   * ```
   */
  patterns?: Pattern[];

  /**
   * Return true when you want to exclude a match from being transformed.
   *
   * ### Examples
   *
   * The following example excludes a match based on the provided name.
   *
   * ```ts
   * import { CommentTemplateProps } from 'https://deno.land/x/comment-templates@0.0.0/mod.ts';
   *
   * const props: CommentTemplateProps = {
   *  content: '<!-- ={excludedName} --><!-- {/excludedName} -->',
   *  variables: {},
   *  exclude: ({ name }) => name.startsWith('excluded')
   * }
   * ```
   */
  exclude?: Exclude;
}

type Exclude = (details: ExcludeDetails) => boolean;

interface ExcludeDetails {
  /**
   * The replacement value after all transformations have been applied.
   */
  value: string;

  /**
   * The starting index for the match (the index of the opening comment tag).
   */
  start: number;

  /**
   * The end index for the full match (the end index of the closing comment tag).
   */
  end: number;

  /**
   * The variable name requested.
   *
   * You might want to skip this value if there are some comment tags that
   * you don't want to use.
   *
   * ### Example
   *
   * The following excludes a match based on the provided name.
   *
   * ```ts
   * import { CommentTemplateProps } from 'https://deno.land/x/comment-templates@0.0.0/mod.ts';
   *
   * const props: CommentTemplateProps = {
   *  content: '<!-- ={excludedName} --><!-- {/excludedName} -->',
   *  variables: {},
   *  exclude: ({ name }) => name.startsWith('excluded'),
   * };
   * ```
   */
  name: string;

  /**
   * The starting index for the content between the tags. What was actually replaced.
   */
  replaceStart: number;

  /**
   * The ending index for the content between the tags. What was actually replaced.
   */
  replaceEnd: number;

  /**
   * The full match.
   */
  fullMatch: string;
}

// type Skip = ()

/**
 * A typesafe implementation of `Object.entries()`
 *
 * Taken from
 * https://github.com/biggyspender/ts-entries/blob/master/src/ts-entries.ts
 */
function entries<
  Type extends object,
  Key extends Extract<keyof Type, string>,
  Value extends Type[Key],
  Entry extends [Key, Value],
>(value: Type): Entry[] {
  return Object.entries(value) as Entry[];
}

/**
 * <!-- ={modExtractTemplateValues|prefix:"\n"|indent:" * "|suffix:"\n * "} --><!-- {/name} -->
 */
export function extractTemplateValues(
  content: string,
): ReadonlyMap<string, string> {
  const items: Array<[name: string, value: string]> = [];
  const matches = content.matchAll(XML_COMMENT_SNIPPET);

  for (const match of matches) {
    const full = match[0];
    const { name, value, open, close } = match.groups ?? {};
    const start = match.index;
    const length = full?.length;

    if (
      !name || !open || !close || typeof start !== "number" || !length || !value
    ) {
      continue;
    }

    items.push([name, value.trim()]);
  }

  return new Map(items);
}

const XML_COMMENT_SNIPPET =
  /(?<open><!--\s*@\{(?<name>[a-z_A-Z$][a-z_A-Z0-9$\.]*)\}\s*-->)(?<value>.*)(?<close><!--\s*\{\/\k<name>\}\s*-->)/gms;
