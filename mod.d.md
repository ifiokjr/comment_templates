<!-- @{snippetCommentTemplate} -->

```ts
import { commentTemplate } from "https://deno.land/x/comment-templates@<%=it.version%>/mod.ts";
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

console.log(transformed);
assertEquals(
  transformed,
  `# <!-- ={exampleName} -->CommentTemplate!<!-- {/exampleName} --><!-- ={exampleVersion|prefix:"@"|code:null} -->\`@2.1.0\`<!-- {/exampleVersion} -->\n`,
);
```

<!-- {/snippetCommentTemplate} -->
