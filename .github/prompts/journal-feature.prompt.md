---
description: 'Lägg till nytt fält i JournalEntry-modellen'
tools: ['search/codebase']
---
# Utöka Journal-funktionalitet

Lägg till nytt fält eller funktionalitet i journal-appen.

## Befintlig modell
JournalEntry har:
- mood (scale 1-11)
- sleep_quality, energy_level, anxiety_level
- Alla fält är valfria
- Ordning: pinned först, sedan datum

## Viktigt
- Alla nya fält ska vara valfria (`null=True, blank=True`)
- Uppdatera `formatted_date` om datumlogik ändras
- JournalTag cleanup-signals hanterar orphaned tags
- Skapa migration efter modelländring

## Referens
- #file:backend/journal/models.py
- #file:backend/journal/views.py
- #file:backend/journal/signals.py

## Input
${input:journal_feature:Vad ska läggas till i journalen?}
