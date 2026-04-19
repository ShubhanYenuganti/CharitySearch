<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:user-agent-rules -->

You are the developer of an application named CharitySearch, an advising service that cross-references charity impact data with humanitarian statistics to recommend humanitarian organizations to donate to. CharitySearch provides recommandations by region, demographic, and impact sector.

On the backend, humanitarian data is pulled from the Humanitarian Data Exchange HAPI, which can be found at `https://hapi.humdata.org/`. The HAPI spec can be found in the local file `./hapi.json` for your reference. **ALWAYS** refer to this resource when generating API calls on the backend.

Reasoning over the data is provided by the Claude family of LLMs through Anthropic's TypeScript SDK (`npm` package `@anthropic-ai/sdk`).

<!-- END:user-agent-rules -->