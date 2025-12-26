---
description: 'Skapa ett nytt Eleventy filter'
tools: ['search/codebase']
---
# Skapa Eleventy Filter

Skapa ett nytt filter för Eleventy-templating i Mitt Psyke.

## Filter-plats
Filters definieras i `frontend/.eleventy.js`

## Befintliga filters som referens
- `relevantSupportlines` - Komplexa scoring-system
- `normalizePortalTag` - Tag-normalisering
- `openStatus` / `statusLabel` - Tillgänglighetskontroll
- `shuffle` - Array-randomisering
- `truncateWords` - Text-förkortning

## Syntax
```javascript
eleventyConfig.addFilter("filterName", function(value, ...args) {
  // Filter logic
  return result;
});
```

## Referens
#file:frontend/.eleventy.js

## Input
${input:filter_description:Vad ska filtret göra?}
