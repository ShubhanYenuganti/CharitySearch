<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:user-agent-rules -->

You are the developer of an application named CharitySearch, an advising service that cross-references charity impact data with humanitarian statistics to recommend humanitarian organizations to donate to. CharitySearch provides recommandations by region, demographic, and impact sector.

On the backend, humanitarian data is pulled from the Humanitarian Data Exchange HAPI, which can be found at `https://hapi.humdata.org/`. The HAPI spec can be found in the local file `hapi.json` for your reference. **ALWAYS** refer to this resource when generating API calls on the backend. HAPI provides the following types of information:

- Affected People
- Coordination & Context
- Food Security, Nutrition & Poverty
- Geography & Infrastructure
- Climate
- Metadata

Types for the HAPI, as well as the wrapper `fetchFromHapi`, can be found in `lib/hapi`.

Reasoning over the data is provided by the Claude family of LLMs through Anthropic's TypeScript SDK (`npm` package `@anthropic-ai/sdk`). A convenience wrapper for the Anthropic SDK can be found in `lib/anthropic`.

**All location codes use ISO 3166 alpha-3.**

## ENUMS OF IMPORTANCE:

### IPC Code

- 1;	None/Minimal	Households are able to meet essential food and non-food needs without engaging in atypical and unsustainable strategies to access food and income.
- 2;	Stressed	Households have minimally adequate food consumption but are unable to afford some essential non-food expenditures without engaging in stress-coping strategies.
- 3;	Crisis	Households either have food consumption gaps that are reflected by high or above-usual acute malnutrition, or are marginally able to meet minimum food needs but only by depleting essential livelihood assets or through crisis-coping strategies.
- 4;	Emergency	Households either have large food consumption gaps which are reflected in very high acute malnutrition and excess mortality, or are able to mitigate large food consumption gaps but only by employing emergency livelihood strategies and asset liquidation.
- 5;	Catastrophe/Famine	Households have an extreme lack of food and/or other basic needs even after full employment of coping strategies. Starvation, death, destitution and extremely critical acute malnutrition levels are evident. (For Famine Classification, an area needs to have extreme critical levels of acute malnutrition and mortality.)
- 3+;	In Need of Action	Sum of population in phases 3, 4, and 5. The population in Phase 3+ does not necessarily reflect the full population in need of urgent action. This is because some households may be in Phase 2 or even 1 but only because of receipt of assistance, and thus, they may be in need of continued action.
- all;	Population	Total population

### Population Status (Humanitarian Need)

- AFF	Affected
- INN	In-need
- TGT	Targeted
- REA	Reached
- all;	No disaggregation, "population" in the source data


### Population Group

REF	Refugees
ROC	People in a refugee-like situation
ASY	Asylum seekers
OIP	Other people in need of international protection
IDP	Internally displaced persons
IOC	People in IDP-like situation
STA	Stateless people
OOC	Others of concern
HST	Host community
RET	Returned refugees
RST	Resettled refugees
NAT	Naturalized refugees
RDP	Returned IDPs
RRI	An umbrella term for returnees, used in the humanitarian needs data which do not distinguish between returned refugees and returned IDPs
all	No disaggregation

<!-- END:user-agent-rules -->