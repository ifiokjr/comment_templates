import {
  doc,
  DocNodeInterface,
  FunctionDef,
  JsDocTag,
  ParamDef,
  TsTypeDef,
  TsTypeParamDef,
} from "../deps.ts";

export async function generateApi(url: URL): Promise<string> {
  const nodes = await doc(url.href, {});
  const entries: string[] = [];

  for (const node of nodes) {
    if (node.kind === "function") {
      const [description = "", examples = ""] =
        node.jsDoc?.doc?.split("### Examples") ?? [];
      const entry = createMarkdownEntry({
        name: node.name,
        signature: createFunctionSignature(node.name, node.functionDef),
        description,
        examples,
      });

      entries.push(entry);
    }

    if (node.kind === "interface") {
      entries.push(extractInterfaceDocs(node));
    }
  }

  return entries.join("\n\n");
}

function extractInterfaceDocs(node: DocNodeInterface): string {
  let signature = `interface ${node.name}`;
  let [description = "", examples = ""] =
    node.jsDoc?.doc?.split("### Examples") ?? [];

  const extendReprs: string[] = node.interfaceDef.extends.map((value) =>
    value.repr
  );
  signature += extendReprs.length
    ? ` extends ${extendReprs.join(", ")} {\n`
    : " {\n";

  const indent = "  ";
  const indexSignatures = node.interfaceDef.indexSignatures.map((signature) => {
    let value = "";
    for (const param of signature.params) {
      if (param.kind === "identifier") {
        value += `[${param.name}: ${
          param.tsType ? extractTsType(param.tsType) : "string"
        }]`;
        break;
      }
    }

    if (signature.tsType) {
      value += `: ${extractTsType(signature.tsType)}`;
    } else {
      value += ": any";
    }

    return `${value};`;
  });

  signature += `${indent}${indexSignatures.join(`\n${indent}`)}`;
  const propertiesSignature: string[] = [];

  for (const property of node.interfaceDef.properties) {
    const doc = getExamplesAndDescription(property.jsDoc?.doc ?? "");
    const typeSignature = property.tsType
      ? `${extractTsType(property.tsType)}${
        extractTypeParams(property.typeParams, ["<", ">"])
      }`
      : `any`;
    const signature = `${property.readonly ? "readonly " : ""}${property.name}${
      property.optional ? "?" : ""
    }: ${typeSignature};`;
    const propertyDescription = `\n\n**${property.name}**:${
      property.optional ? " _(optional)_" : ""
    } \`${property.readonly ? "readonly " : ""}${typeSignature}\`\n\n${
      doc.description ? `${doc.description}\n\n` : ""
    }`;
    const propertyExample = doc.examples
      ? `\n\n**${property.name}**\n\n${doc.examples}`
      : "";

    description += propertyDescription;
    examples += propertyExample;
    propertiesSignature.push(signature);
  }

  signature = `\`\`\`ts\n${signature}${
    propertiesSignature.join(`\n${indent}`)
  }\n}\n\`\`\``;

  const value = createMarkdownEntry({
    name: node.name,
    signature,
    description,
    examples,
  });

  return value;
}

function getExamplesAndDescription(doc: string) {
  const [description = "", examples = ""] = doc.split("### Examples") ?? [];
  return { description, examples };
}

// deno-lint-ignore no-unused-vars
function getDefaultJsDocValue(tags: JsDocTag[] | undefined) {
}

function extractTypeParam(
  param: TsTypeParamDef,
  wrap: [string, string] = ["", ""],
): string {
  let entry = param.name;

  if (param.constraint) {
    entry += ` extends ${param.constraint.repr}`;
  }

  if (param.default) {
    entry += ` = ${param.default.repr}`;
  }

  const [start, end] = wrap;
  return `${start}${entry}${end}`;
}

function extractTypeParams(
  params: TsTypeParamDef[],
  wrap: [string, string] = ["", ""],
): string {
  if (!params.length) {
    return "";
  }

  const entries: string[] = [];

  for (const param of params) {
    entries.push(extractTypeParam(param));
  }

  const [start, end] = wrap;
  return `${start}${entries.join(", ")}${end}`;
}

function extractTsType(
  type: TsTypeDef,
  wrap: [string, string] = ["", ""],
): string {
  let value = "";

  if (type.kind === "union") {
    return extractTsTypes(type.union, undefined, " | ");
  } else if (type.kind === "array") {
    return extractTsType(type.array, ["", "[]"]);
  } else if (type.kind === "typeRef") {
    value = type.typeRef.typeName +
      extractTsTypes(type.typeRef.typeParams ?? [], ["<", ">"]);
  } else if (type.kind === "keyword") {
    value = type.keyword;
  } else {
    value = type.repr;
  }

  return `${wrap[0]}${value}${wrap[1]}`;
}

function extractTsTypes(
  types: TsTypeDef[],
  wrap: [string, string] = ["", ""],
  delimeter = ", ",
) {
  if (!types.length) {
    return "";
  }

  const entries: string[] = [];

  for (const type of types) {
    entries.push(extractTsType(type));
  }

  const [start, end] = wrap;
  return `${start}${entries.join(delimeter)}${end}`;
}

function extractParams(params: Array<ParamDef | undefined>): string {
  if (!params.length) {
    return "";
  }

  const entries: string[] = [];
  for (const param of params) {
    if (!param) {
      continue;
    }

    if (param.kind === "identifier") {
      let entry = param.name;

      if (param.tsType) {
        entry += extractTsType(param.tsType, [": ", ""]);
      }

      entries.push(entry);
      continue;
    }
  }

  return entries.join(", ");
}

function createFunctionSignature(name: string, definition: FunctionDef) {
  const asyncMessage = definition.isAsync ? "async " : "";
  const template = extractTypeParams(definition.typeParams, ["<", ">"]);
  const params = extractParams(definition.params);
  const returns = definition.returnType
    ? extractTsType(definition.returnType)
    : "void";

  return `\
\`\`\`ts
declare ${asyncMessage}function ${name}${template}(${params}): ${returns};
\`\`\``;
}

interface CreateMarkdownEntry {
  name: string;
  signature: string;
  description: string;
  examples: string;
}

function createMarkdownEntry(props: CreateMarkdownEntry): string {
  const { description, examples, name, signature } = props;
  return `\
<table><tr><td width="400px" valign="top">

### \`${name}\`

<br />

${signature}

<br />

${description}

</td><td width="600px"><br />

${examples}

</td></tr></table>
`;
}
