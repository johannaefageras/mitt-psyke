---
description: 'Skapa en ny portal-sida för Mitt Psyke'
tools: ['search/codebase']
---
# Skapa ny Portal

Skapa en ny portal (tematisk sida om psykisk hälsa) för Mitt Psyke.

## Portal-struktur
Portaler är Markdown-filer i `frontend/src/portaler/` med front matter.

## Referens
Se befintliga portaler för format och stil:
- #file:frontend/src/portaler/

## Front Matter Mall
```yaml
---
title: "Portal-titel på svenska"
subtitle: "Kort beskrivning"
description: "Längre beskrivning för SEO"
icon: "🌟"
relatedTags: ["relevant-tag-1", "relevant-tag-2"]
order: 10
layout: layouts/portal.njk
---
```

## Innehållsriktlinjer
- Skriv på svenska med varm, stödjande ton
- Undvik kliniskt språk
- Inkludera praktiska tips
- Använd `relatedTags` som matchar stödlinjer i databasen

## Input
${input:portal_topic:Vilket ämne ska portalen handla om?}
