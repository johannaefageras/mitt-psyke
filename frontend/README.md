# Mitt Psyke

En samling svenska stödlinjer och resurser för psykisk hälsa.

## Kom igång

### Installation

```bash
npm install
```

### Utveckling

Starta utvecklingsservern med hot reload:

```bash
npm start
```

Sajten körs på `http://localhost:8080`

### Bygg för produktion

```bash
npm run build
```

Output hamnar i `_site/`-mappen.

## Projektstruktur

```
mitt-psyke/
├── .eleventy.js          # Eleventy-konfiguration
├── package.json
├── src/
│   ├── _data/            # Global data
│   │   ├── site.json     # Sajt-metadata
│   │   ├── navigation.json
│   │   ├── quotes.json   # Inspirerande citat
│   │   ├── supportData.json   # Källdata: alla stödresurser
│   │   └── supportlines.js    # Adapter: data som templates använder
│   │
│   ├── _includes/        # Layouts och partials
│   │   ├── layouts/
│   │   │   ├── base.njk
│   │   │   ├── page.njk
│   │   │   └── portal.njk
│   │   └── partials/
│   │       ├── header.njk
│   │       └── footer.njk
│   │
│   ├── assets/           # CSS, JS, bilder
│   │
│   ├── portaler/         # Portaler (översikt + ämnes-sidor i Markdown)
│   │
│   ├── index.njk         # Startsida
│   ├── stodlinjer.njk    # Alla stödlinjer
│   ├── om.njk            # Om sidan
│   └── kontakt.njk       # Kontakt
│
└── _site/                # Genererad output (gitignore)
```

## Data

### Stödlinjer (`supportData.json` → `supportlines`)

Källdatan ligger i `supportData.json`. Sajten använder en adapter (`supportlines.js`) som exponerar en förenklad lista som `supportlines` i templates.

Varje stödresurs innehåller bl.a.:

- Namn, telefonnummer, URL
- Beskrivning och öppettider
- Kategori och taggar
- Markering för akuta linjer

### Portaler (`src/portaler/`)

Tematiska ingångar ligger som Markdown-filer i `src/portaler/` och använder layouten `src/_includes/layouts/portal.njk`.

Skapa en ny portal genom att lägga till en fil som `src/portaler/min-portal.md` med front matter, t.ex.:

```md
---
title: Min portal
subtitle: En kort underrubrik
description: En mening som visas på startsidan.
icon: 🙂
relatedTags: [psykiskohalsa]
order: 10
---
```

### Citat (`quotes.json`)

Inspirerande citat från svenska författare och personligheter

## Features

- 🌓 Mörkt/ljust tema (sparas i localStorage)
- 📱 Responsiv design
- ♿ Tillgänglig (WCAG)
- 🚀 Snabb statisk sajt
- 📞 Klickbara telefonnummer

## Licens

[Din licens här]
