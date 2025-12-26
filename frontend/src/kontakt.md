---
layout: layouts/page.njk
title: Kontakt
subtitle: Hör av dig med frågor eller förbättringsförslag
permalink: /kontakt/
---

## Tipsa om ändringar

Har du hittat felaktig information, inaktuella kontaktuppgifter, eller vet om en stödlinje som borde finnas med?

Skicka ett mejl till: **[info@mittpsyke.se](mailto:info@mittpsyke.se)**

## Viktigt att veta

**Mitt Psyke är inte en stödlinje.** Vi kan inte erbjuda samtalsstöd eller rådgivning.

Om du behöver prata med någon:

{% for hotline in hotlines %}

- **{{ hotline.number }}** – {{ hotline.name }} ({{ hotline.availability | lower }})
  {% endfor %}

Se vår [samling av stödlinjer](/stodlinjer/) för fler alternativ.

## Om tekniska problem

Om webbplatsen inte fungerar som den ska, beskriv gärna problemet i ett mejl så undersöker vi det.
