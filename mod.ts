/**
 * Provide a string which contains template tags (using html and slash comments)
 * that should be replaced with the variables provided.
 *
 * ```md
 * <!-- ={name} -->Placeholder text<!-- {/name} -->
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
 * <!-- ={sample|prefix:"This is a prefix"|codeblock:"tsx"|suffix:"This is a suffix"} --><!-- {/sample} -->
 * ```
 *
 * The supported pipe names are.
 *
 * - `string`: `|string:true` will wrap the value in quotes.
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
 * import { markdownTemplate, code } from 'https://deno.land/x/markdown_template/mod.ts';
 * const version = '@2.1.0';
 * const name = 'comment_templates';
 * const fileUrl = new URL('readme.md', import.meta.url);
 * const content = await Deno.readTextFile(fileUrl);
 *
 * // Transform and use the variables in the content.
 * const transformed = markdownTemplate({
 *   content,
 *   variables: { version, name }
 * });
 *
 * await Deno.writeFile(fileUrl, transformed);
 * ```
 *
 * **Before:** `readme.md`
 *
 * ```md
 * # <!-- ={name} --><!-- {/name} --><!-- ={version|code} --><!-- {/version} -->
 * ```
 *
 * **After:** `readme.md`
 *
 * ```md
 * # <!-- ={name} -->package<!-- {/name} --><!-- ={version} -->`@2.1.0`<!-- {/version} -->
 * ```
 */
export function markdownTemplate(props: MarkdownTemplateProps): string {
  const {
    content,
    variables,
    throwIfMissingVariable = false,
    patterns = ['slash', 'xml'],
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

      if (!name || !open || !close || typeof start !== 'number' || !length) {
        continue;
      }

      const end = start + length;
      const [replaceStart, replaceEnd] = [
        start + open.length,
        end - close.length,
      ];

      let replacementValue: string;
      const rawValue = variables[name];

      if (typeof rawValue === 'string') {
        replacementValue = rawValue;
      } else if (typeof rawValue === 'function') {
        replacementValue = rawValue(value);
      } else {
        if (throwIfMissingVariable) {
          throw new CommentTemplateError(`Missing variable: '${name}'`);
        }

        continue;
      }

      const before = transformed.slice(0, replaceStart);
      const after = transformed.slice(replaceEnd, transformed.length);
      transformed = `${before}${fn(replacementValue)}${after}`;
    }
  }

  return transformed;
}

const pipes = {
  string:
    (singleQuotes = false) =>
    (value: string) => {
      const quoteType = singleQuotes ? "'" : '"';
      return `${quoteType}${value}${quoteType}`;
    },
  prefix:
    (prefix = '') =>
    (value: string) => {
      return `${prefix}${value}`;
    },
  suffix:
    (suffix = '') =>
    (value: string) => {
      return `${value}${suffix}`;
    },
  codeblock:
    (language = '') =>
    (value: string) => {
      return `\`\`\`${language}\n${value}\n\`\`\``;
    },
  indent:
    (indent = '') =>
    (value: string) => {
      return value
        .split('\n')
        .map((line) => `${indent}${line}`)
        .join('\n');
    },
  code: () => (value: string) => {
    return `\`${value}\``;
  },
  replace: (value = '') => {
    const [search = '', replace = ''] = value.split(',');
    return (value: string) => {
      return value.replaceAll(search, replace);
    };
  },
};

type Piper = (value: string) => string;
interface ArgToken {
  type: 'arg';
  value: string | null | number | boolean;
}
interface PipeToken {
  type: 'pipe';
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

    if (char === '|') {
      index++; // Skip the pipe character
      const remaining = pipeString.slice(index);
      const nextIndex = remaining.search(/[^a-z_A-Z0-9$]/);
      tokens.push({ type: 'pipe', name: remaining.slice(0, nextIndex) });
      index += nextIndex;
      continue;
    }

    if (char === ':') {
      let shouldContinue = false;
      index++;

      for (const [name, value] of entries(primitives)) {
        if (pipeString.slice(index, index + name.length) !== name) {
          continue;
        }

        tokens.push({ type: 'arg', value });
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
        tokens.push({ type: 'arg', value });
        index += value.length + 1;
        continue;
      }

      if (/[\.0-9_]/.test(value)) {
        const remaining = pipeString.slice(index);
        const nextIndex = remaining.search(/[^\.0-9_]/);
        const value = Number(remaining.slice(0, nextIndex));
        tokens.push({ type: 'arg', value });
        index += nextIndex;
        continue;
      }
    }

    index++;
  }

  let args: ArgToken['value'][] = [];
  let fn: // deno-lint-ignore no-explicit-any
  ((...args: any[]) => Piper) | undefined;

  for (const token of tokens) {
    if (token.type === 'arg') {
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
  /(?<open><!--\s*=\{(?<name>[a-z_A-Z0-9$]+)(?<pipes>(?:\|[a-z_A-Z0-9$]+(?::(?:null|true|false|[0-9_\.]+|"[^"]*")*))*)\}\s*-->)(?<value>.*)(?<close><!--\s*\{\/\k<name>\}\s*-->)/gm;
const SLASH_COMMENT_VARIABLE =
  /(?<open>\/\*\s*=\{(?<name>[a-z_A-Z0-9$]+)(?<pipes>(?:\|[a-z_A-Z0-9$]+(?::(?:null|true|false|[0-9_\.]+|"[^"]*")))*)\}\s*\*\\)(?<value>.*)(?<close>\/\*\s*\{\/\k<name>\}\s*\*\\)/gm;

//(?:string|prefix|suffix|codeblock|indent|code|replace)

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
   * ```
   * try {
   *   const content = await Deno.readFile(new URL('readme.md', import.meta.url));
   *   markdownTemplate({ content, variables, throwIfMissingVariable: true });
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

export interface CommentTemplateVariables {
  [name: string]: string | ((currentValue: string | undefined) => string);
}

export interface MarkdownTemplateProps {
  /**
   * The content to transform.
   */
  content: string;
  /**
   * Pass variables to the template which replace the content.
   *
   * If a function is provided it is called with the current value, which can be
   * undefined.
   *
   * Variables must be a flat object structure and cannot contain nested objects.
   *
   * There is currently no support for nesting.
   */
  variables: CommentTemplateVariables;

  /**
   * Throw an error if a variable is not found.
   *
   * @default false
   */
  throwIfMissingVariable?: boolean;

  /**
   * The comment patterns to match for the provided content.
   *
   * @default ['html', 'slash']
   */
  patterns?: Pattern[];
}

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
