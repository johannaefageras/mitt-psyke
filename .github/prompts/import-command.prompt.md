---
description: 'Skapa Django management command för dataimport'
tools: ['search/codebase']
---
# Skapa Import Command

Skapa ett Django management command för att importera data från JSON-filer.

## Mönster att följa
Befintliga import-commands i projektet:
- `import_support_lines`
- `import_support_line_categories`
- `import_hotlines`
- `import_quotes`

## Krav
- Stöd `--replace` flagga för att rensa befintlig data
- Läs från `frontend/src/_data/` JSON-filer
- Hantera fel gracefully med tydliga meddelanden
- Använd `self.stdout.write()` för output

## Referens
#file:backend/api/management/commands/

## Input
${input:command_description:Vad ska importeras och från vilken fil?}
