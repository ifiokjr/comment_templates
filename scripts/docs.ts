import { doc } from 'https://deno.land/x/deno_doc@v0.35.0/mod.ts';

const mainUrl = new URL('../mod.ts', import.meta.url);
const markdownTemplatesDoc = await doc(mainUrl.href, {});

for (const a of markdownTemplatesDoc) {
	switch (a.kind) {
		case 'function':
			{
				console.log(a.name, a.jsDoc?.doc, a.jsDoc?.tags);
        a.declarationKind
			}

			break;

		default:
			break;
	}
}
