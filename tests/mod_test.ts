import {
  commentTemplate,
  CommentTemplateError,
  extractTemplateValues,
} from "../mod.ts";
import { assertEquals, assertThrows, describe, it } from "./deps.ts";
import { snapshot } from "./helpers.ts";

describe("commentTemplate", () => {
  it("should transform basic content", async (t) => {
    const content =
      `# <!-- ={name} --><!-- {/name} -->\n\nAnd some other content`;
    const transformed = commentTemplate({
      content,
      variables: { name: "a new header" },
    });

    await snapshot(t, transformed);
  });

  it("should transform content with multiple lines", async (t) => {
    const content =
      `# <!-- ={name} -->\n\n\n<!-- {/name} -->\n\nAnd some other content`;
    const transformed = commentTemplate({
      content,
      variables: { name: "a new header" },
    });

    await snapshot(t, transformed);
  });

  it("should handle multiple transformations", async (t) => {
    const content =
      `# <!-- ={name} --><!-- {/name} -->\n\nAnd some other <!-- ={adjective} --><!-- {/adjective} -->content\n  this is a <!-- ={size} -->replace me<!-- {/size} -->.`;
    const transformed = commentTemplate({
      content,
      variables: {
        name: "a new header",
        adjective: "awesome",
        size: "large",
      },
    });

    await snapshot(t, transformed);
  });

  it("should skip content when no variable defined", async (t) => {
    const content =
      `# <!-- ={name} --><!-- {/name} -->\n\nAnd some other <!-- ={adjective} --><!-- {/adjective} -->content\n  this is a <!-- ={size} -->replace me<!-- {/size} -->.`;
    const transformed = commentTemplate({
      content,
      variables: { name: "a new header", adjective: "awesome" },
    });

    await snapshot(t, transformed);
  });

  it("should throw when no variable defined and `throwIfMissingVariable: true`", () => {
    const content =
      `# <!-- ={name} --><!-- {/name} -->\n\nAnd some other <!-- ={adjective} --><!-- {/adjective} -->content\n  this is a <!-- ={size} -->replace me<!-- {/size} -->.`;
    const fn = () =>
      commentTemplate({
        throwIfMissingVariable: true,
        content,
        variables: { name: "a new header", adjective: "awesome" },
      });

    assertThrows(fn, CommentTemplateError);
  });

  it("should support multiline comments", async (t) => {
    const content =
      `# <!-- \n={name} --><!-- {/name} -->\n\nAnd some other <!-- ={adjective}\n --><!--         {/adjective} -->content\n  this is a <!-- ={size} -->replace me<!-- {/size} -->.`;
    const transformed = commentTemplate({
      content,
      variables: {
        name: "a new header",
        adjective: "awesome",
        size: "small",
      },
    });

    await snapshot(t, transformed);
  });

  it("should support function variables", async (t) => {
    const content =
      `# <!-- ={name} --><!-- {/name} -->\n\nAnd some other <!-- ={adjective} --><!-- {/adjective} -->content\n  this is a <!-- ={size|code:|suffix:" as code"} -->replace me<!-- {/size} -->.`;
    const transformed = commentTemplate({
      content,
      variables: {
        name: "a new header",
        adjective: "awesome",
        size: (value = "") => `${value.split("").reverse().join("")}`,
      },
    });

    await snapshot(t, transformed);
  });

  describe("pipes", () => {
    it("string:false", async (t) => {
      const content = `<!-- ={test|string:false} --><!-- {/test} -->`;
      const transformed = commentTemplate({
        content,
        variables: { test: "a good test" },
      });

      await snapshot(t, transformed);
    });

    it("string:true", async (t) => {
      const content = `<!-- ={test|string:true} --><!-- {/test} -->`;
      const transformed = commentTemplate({
        content,
        variables: { test: "a good test" },
      });

      await snapshot(t, transformed);
    });

    it("prefix", async (t) => {
      const content = `<!-- ={test|prefix:"not "} --><!-- {/test} -->`;
      const transformed = commentTemplate({
        content,
        variables: { test: "a good test" },
      });

      await snapshot(t, transformed);
    });

    it("suffix", async (t) => {
      const content = `<!-- ={test|suffix:", okay..."} --><!-- {/test} -->`;
      const transformed = commentTemplate({
        content,
        variables: { test: "a good test" },
      });

      await snapshot(t, transformed);
    });

    it("codeblock", async (t) => {
      const content = `<!-- ={test|codeblock:""} --><!-- {/test} -->`;
      const transformed = commentTemplate({
        content,
        variables: { test: "a good test" },
      });

      await snapshot(t, transformed);
    });

    it("indent", async (t) => {
      const content = `<!-- ={test|indent:"  "} --><!-- {/test} -->`;
      const transformed = commentTemplate({
        content,
        variables: { test: "a good test" },
      });

      await snapshot(t, transformed);
    });

    it("code", async (t) => {
      const content = `<!-- ={test|code:} --><!-- {/test} -->`;
      const transformed = commentTemplate({
        content,
        variables: { test: "a good test" },
      });

      await snapshot(t, transformed);
    });

    it("replace", async (t) => {
      const content = `<!-- ={test|replace:"<!--,other"} --><!-- {/test} -->`;
      const transformed = commentTemplate({
        content,
        variables: { test: "<!-- Hello -->" },
      });

      await snapshot(t, transformed);
    });
  });
});

describe("extractTemplateValues", () => {
  it("should extract simple content", () => {
    const content = "<!-- @{test} -->some content<!-- {/test} -->";
    const extracted = extractTemplateValues(content);

    assertEquals(Object.fromEntries(extracted), { test: "some content" });
  });

  it("can extract multiple items", () => {
    const content =
      `<!-- @{test} -->some content<!-- {/test} -->\n\n<!-- @{other} -->\n\nother content\n<!-- {/other} -->\n
      \nthis is not captured\n\n
      <!-- @{final} -->final\n\n\n\n content<!-- {/final} -->`;
    const extracted = extractTemplateValues(content);
    const expected = {
      test: "some content",
      other: "other content",
      final: "final\n\n\n\n content",
    };

    assertEquals(Object.fromEntries(extracted), expected);
  });
});
