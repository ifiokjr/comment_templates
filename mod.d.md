<!-- @{modCommentTemplate} -->

Provide a string which contains template tags (using html and slash comments) that should be replaced with the variables provided.

```md
<!-- ={exampleName} -->Placeholder text<!-- {/exampleName} -->
```

The above code will replace `Placeholder text` with the value of the `name` variable.

Unlike usual template formats, the wrapping comment tags are not not processed by the template engine. Only the wrapped content is replaced. This allows the template values to be updated continually.

Since `html` comments don't work within markdown codeblocks you should pass the full codeblock as one of the variable values. You can use pipes to make sure the content is properly wrapped as a codeblock.

```md
<!-- ={sample|codeblock:"tsx"} -->|<!-- {/sample} -->
```

The above would transform the variable value of sample into a codeblock with the language `tsx`.

- `|` is used to separate the pipes.
- `:` is used to apply different arguments to the underlying pipe transformation.
- Multiple pipes can be applied to a single value.

```md
<!-- ={examplePipe|prefix:"This is a prefix"|codeblock:"tsx"|suffix:"This is a suffix"} --><!-- {/examplePipe} -->
```

The supported pipe names are.

- `trim`: `|trim:null` trim all whitespace from the start and end of the content.
- `trimStart`: `|trim:null` trim all whitespace from the start of the content.
- `trimEnd`: `|trim:null` trim all whitespace from the end of the content.
- `string`: `|string:true` will wrap the value in single quotes. |string:false` will wrap the value in double quotes.
- `prefix`: `|prefix:"prefix"` will prefix the value with the provided string.
- `suffix`: `|suffix:"suffix"` will suffix the value with the provided string.
- `codeblock`: `|codeblock:"language"` will wrap the value in a codeblock with the provided language and set the indentation.
- `indent`: `|indent:" "` will indent each line by the provided string. This can be used to provide custom prefixes like `|indent:" * "` to
- `code`: `|code:null` will wrap the value in inline code `\`` backticks.
- `replace`: `|replace:"search,replace"` will replace the search string with the replacement where the `,` is used to split the string.

The supported pipe arguments are `true`, `false`, `null`, any number `0123456789_` and any string wrapped in double quotes `"string"`

**NOTE**: The pipe arguments are not processed with regex and at the moment the regex is timing out when a single pipe is used without arguments. In order to use a single pipe, please provide an argument, even if it is an empty string.

### Examples

```ts
import {
  commentTemplate,
} from "https://deno.land/x/comment-templates@<%=it.version%>/mod.ts";
import { assertEquals } from "./tests/deps.ts";

const exampleVersion = "2.1.0";
const exampleName = "Comment Template!";
const fileUrl = new URL("tests/fixtures/sample.md", import.meta.url);
const content = await Deno.readTextFile(fileUrl);

// Transform and use the variables in the content.
const transformed = commentTemplate({
  content,
  variables: { exampleVersion, exampleName },
});

assertEquals(
  transformed,
  `# <!-- ={exampleName} -->CommentTemplate!<!-- {/exampleName} --><!-- ={exampleVersion|prefix:"@"|code:null} -->\`@2.1.0\`<!-- {/exampleVersion} -->\n`,
);
```

**Before:** `readme.md`

```md
# <!-- ={name} --><!-- {/name} --><!-- ={version|prefix:"@"|code:null} --><!-- {/version} -->
```

**After:** `readme.md`

```md
# <!-- ={name} -->package<!-- {/name} --><!-- ={version} -->`@2.1.0`<!-- {/version} -->
```

<!-- {/modCommentTemplate} -->

<!-- ={modExtractTemplateValues} -->

Extract the snippets from the provided content.

This returns each named snippet in a map.

### Examples

The following example extracts the snippets from the provided content.

```ts
import {
  extractTemplateValues,
} from "https://deno.land/x/comment-templates@<%=it.version%>/mod.ts";

const content = await Deno.readTextFile("./mod.d.md");
const variables = extractTemplateValues(content);
// => ReadonlyMap<string, string>
```

<!-- {/modExtractTemplateValues} -->
