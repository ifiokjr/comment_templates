import { CommentTemplateError, markdownTemplate } from "../mod.ts";
import { assertThrows, describe, it } from "./deps.ts";
import { snapshot } from "./helpers.ts";

describe("markdownTemplate", () => {
  it("should transform basic content", async (t) => {
    const content =
      `# <!-- ={name} --><!-- {/name} -->\n\nAnd some other content`;
    const transformed = markdownTemplate({
      content,
      variables: { name: "a new header" },
    });

    await snapshot(t, transformed);
  });

  it("should handle multiple transformations", async (t) => {
    const content =
      `# <!-- ={name} --><!-- {/name} -->\n\nAnd some other <!-- ={adjective} --><!-- {/adjective} -->content\n  this is a <!-- ={size} -->replace me<!-- {/size} -->.`;
    const transformed = markdownTemplate({
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
    const transformed = markdownTemplate({
      content,
      variables: { name: "a new header", adjective: "awesome" },
    });

    await snapshot(t, transformed);
  });

  it("should throw when no variable defined and `throwIfMissingVariable: true`", () => {
    const content =
      `# <!-- ={name} --><!-- {/name} -->\n\nAnd some other <!-- ={adjective} --><!-- {/adjective} -->content\n  this is a <!-- ={size} -->replace me<!-- {/size} -->.`;
    const fn = () =>
      markdownTemplate({
        throwIfMissingVariable: true,
        content,
        variables: { name: "a new header", adjective: "awesome" },
      });

    assertThrows(fn, CommentTemplateError);
  });

  it("should support multiline comments", async (t) => {
    const content =
      `# <!-- \n={name} --><!-- {/name} -->\n\nAnd some other <!-- ={adjective}\n --><!--         {/adjective} -->content\n  this is a <!-- ={size} -->replace me<!-- {/size} -->.`;
    const transformed = markdownTemplate({
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
    const transformed = markdownTemplate({
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
      const transformed = markdownTemplate({
        content,
        variables: { test: "a good test" },
      });

      await snapshot(t, transformed);
    });

    it("string:true", async (t) => {
      const content = `<!-- ={test|string:true} --><!-- {/test} -->`;
      const transformed = markdownTemplate({
        content,
        variables: { test: "a good test" },
      });

      await snapshot(t, transformed);
    });

    it("prefix", async (t) => {
      const content = `<!-- ={test|prefix:"not "} --><!-- {/test} -->`;
      const transformed = markdownTemplate({
        content,
        variables: { test: "a good test" },
      });

      await snapshot(t, transformed);
    });

    it("suffix", async (t) => {
      const content = `<!-- ={test|suffix:", okay..."} --><!-- {/test} -->`;
      const transformed = markdownTemplate({
        content,
        variables: { test: "a good test" },
      });

      await snapshot(t, transformed);
    });

    it("codeblock", async (t) => {
      const content = `<!-- ={test|codeblock:""} --><!-- {/test} -->`;
      const transformed = markdownTemplate({
        content,
        variables: { test: "a good test" },
      });

      await snapshot(t, transformed);
    });

    it("indent", async (t) => {
      const content = `<!-- ={test|indent:"  "} --><!-- {/test} -->`;
      const transformed = markdownTemplate({
        content,
        variables: { test: "a good test" },
      });

      await snapshot(t, transformed);
    });

    it("code", async (t) => {
      const content = `<!-- ={test|code:} --><!-- {/test} -->`;
      const transformed = markdownTemplate({
        content,
        variables: { test: "a good test" },
      });

      await snapshot(t, transformed);
    });

    it("replace", async (t) => {
      const content = `<!-- ={test|replace:"<!--,other"} --><!-- {/test} -->`;
      const transformed = markdownTemplate({
        content,
        variables: { test: "<!-- Hello -->" },
      });

      await snapshot(t, transformed);
    });
  });
});
