module.exports = function (eleventyConfig) {
  const MarkdownIt = require('markdown-it');
  const { checkOpenStatus, getStatusLabel } = require('./src/_data/openStatus.js');
  const http = require('node:http');
  const https = require('node:https');

  const DEFAULT_BROAD_TAGS = [
    'psykiskohalsa',
    'samtal',
    'anonymt',
    'webb',
    'telefon',
    'chatt',
    'sms',
    'mejl',
    'e-post'
  ];

  const normalizePortalTagValue = (tag) => {
    const t = String(tag ?? '')
      .trim()
      .toLowerCase();
    if (!t) return '';

    const map = {
      psykiskohalsa: 'psykiskohalsa',
      valdsbrott: 'valdbrott',
      ptsd: 'trauma',
      panikangest: 'angest',
      nedstamdhet: 'depression',
      oro: 'angest',
      ungdom: 'barn-unga',
      samtalsstod: 'samtal',
      kris: 'akut'
    };

    return map[t] ?? t;
  };

  // Kopiera assets till output
  eleventyConfig.addPassthroughCopy('src/assets');

  // Watch för CSS och JS ändringar
  eleventyConfig.addWatchTarget('src/assets/');

  // Collection: Portaler (ämnes-sidor)
  eleventyConfig.addCollection('portaler', (collectionApi) => {
    return collectionApi
      .getFilteredByTag('portal')
      .sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0));
  });

  // Collection: Viktiga sidor (policy/legala/metadata)
  eleventyConfig.addCollection('viktigaSidor', (collectionApi) => {
    return collectionApi
      .getFilteredByTag('viktig-sida')
      .sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0));
  });

  // Shortcode: Icons using MP Icons icon font
  // Default weight: mpl (Line/400), hover/active: mps (Solid/700)
  // Maps old symbol-{name} IDs to mp-{name} icon font classes
  eleventyConfig.addNunjucksShortcode('icon', (id, className = '') => {
    if (!id) return '';

    const escapeAttr = (value) =>
      String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('"', '&quot;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');

    // Map old symbol IDs to new MP Icons class names
    // Format: symbol-{old-name} -> mp-{new-name}
    const iconNameMap = {
      // Direct mappings (same name)
      'login-1': 'login-1',
      'user': 'user',
      'sun': 'sun',
      'moon': 'moon',
      'phone-emergency': 'phone-emergency',
      'scale': 'scale',
      'phone': 'phone',
      'search': 'search',
      'arrow-right': 'arrow-right',
      'pencil': 'pencil',
      'battery-charging': 'battery-charging',
      'bed': 'bed',
      'anxiety': 'anxiety',
      'calendar-month': 'calendar-month',
      'tag-2': 'tag-2',
      'notebook': 'notebook',
      'view': 'view',
      'trash': 'trash',
      'delete': 'delete',
      'star': 'star',
      'sparkles': 'sparkles',
      'envelope': 'envelope',
      'location-pin': 'location-pin',
      'envelope-check': 'envelope-check',
      'logout-1': 'logout-1',
      'feather': 'feather',
      'chevron-right': 'chevron-right',
      'chevron-left': 'chevron-left',
      'copy-file': 'copy-file',
      'grid-2x2': 'grid-2x2',
      'brain': 'brain',
      'group': 'group',
      'asterisk-2': 'asterisk-2',
      'bell': 'bell',
      'cloud-rain': 'cloud-rain',
      'life-ring-1': 'life-ring-1',
      'cognitive': 'cognitive',
      'plugin': 'plugin',
      'incognito': 'incognito',
      'warning-circle': 'warning-circle',
      'contract-sign': 'contract-sign',
      'cookie': 'cookie',
      'old-person-walker': 'old-person-walker',
      'heart': 'heart',
      'save': 'save',
      'cog': 'cog',
      'check': 'check',
      'family': 'family',
      'police-car': 'police-car',
      'wine': 'wine',
      'wine-glass': 'wine-glass',
      'band-aid': 'band-aid',
      'heart-broken': 'heart-broken',
      'shield': 'shield',
      'sunset': 'sunset',
      // Renamed mappings (old name -> new name)
      'information-circle': 'info-circle',
      'pushpin': 'pin-1',
      'badge-star': 'star-badge',
      'bolt': 'flash-1',
      'heart-1': 'heart',
      'floppy-disk': 'save',
      'cloud': 'cloud-1',
      'sunset-2': 'sunset',
      'cog-1': 'cog',
      'check-mark': 'check',
      'family-2': 'family',
      'police': 'police-car',
      'wine-glass-2': 'wine-glass',
      'bandage': 'band-aid',
      'broken-heart': 'heart-broken'
    };

    // Extract icon name from symbol-{name} format
    let iconName = id;
    if (iconName.startsWith('symbol-')) {
      iconName = iconName.slice(7); // Remove 'symbol-' prefix
    }

    // Apply mapping if exists, otherwise use as-is
    const mpIconName = iconNameMap[iconName] || iconName;

    const safeClass = escapeAttr(className);
    const wrapperClasses = ['icon-swap', safeClass].filter(Boolean).join(' ');

    // Generate icon font markup with weight-based variant system
    // mpl (weight 400) = default state, mps (weight 700) = hover/active state
    return (
      `<span class="${wrapperClasses}" aria-hidden="true">` +
      `<i class="mp mpl mp-${mpIconName} icon icon--line" aria-hidden="true"></i>` +
      `<i class="mp mps mp-${mpIconName} icon icon--solid" aria-hidden="true"></i>` +
      `</span>`
    );
  });

  // Lägg till ett filter för svenska datum
  eleventyConfig.addFilter('svenskDatum', (dateObj) => {
    return new Date(dateObj).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  });

  // Random filter för citat
  eleventyConfig.addFilter('random', (arr) => {
    return arr[Math.floor(Math.random() * arr.length)];
  });

  // Truncate text by word count (for card excerpts etc.)
  eleventyConfig.addFilter('truncateWords', (value, maxWords = 15, suffix = '…') => {
    const text = String(value ?? '').trim();
    if (!text) return '';

    const words = text.split(/\s+/).filter(Boolean);
    if (words.length <= maxWords) return text;

    return `${words.slice(0, Math.max(0, maxWords)).join(' ')}${suffix}`;
  });

  // Shuffle an array (used to randomize supportline order)
  eleventyConfig.addFilter('shuffle', (value) => {
    const arr = Array.isArray(value) ? [...value] : [];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });

  // Keep supportlines with phone numbers above those without.
  eleventyConfig.addFilter('supportlinesPhoneFirst', (value) => {
    const lines = Array.isArray(value) ? value : [];
    const withNumber = [];
    const withoutNumber = [];

    for (const line of lines) {
      const hasNumber = Boolean(String(line?.number ?? '').trim());
      if (hasNumber) {
        withNumber.push(line);
      } else {
        withoutNumber.push(line);
      }
    }

    return withNumber.concat(withoutNumber);
  });

  // Filter för tel:-länkar från stödlinje-nummer
  eleventyConfig.addFilter('telHref', (value) => {
    return String(value ?? '').replace(/[^0-9+]/g, '');
  });

  // Normalize portal tags to match supportline tags/categories.
  eleventyConfig.addFilter('normalizePortalTag', (tag) => {
    return normalizePortalTagValue(tag);
  });

  // Check if a support line is currently open (for build-time status)
  eleventyConfig.addFilter('openStatus', (openingHours) => {
    return checkOpenStatus(openingHours);
  });

  // Get a simple status label from opening hours
  eleventyConfig.addFilter('statusLabel', (openingHours) => {
    const status = checkOpenStatus(openingHours);
    return getStatusLabel(status);
  });

  // Serialize opening hours to JSON for client-side use
  eleventyConfig.addFilter('jsonify', (value) => {
    return JSON.stringify(value);
  });

  // Rank & limit supportlines shown on portal pages.
  // Goal: avoid "everything matches" when a portal includes broad tags like `psykiskohalsa`.
  eleventyConfig.addFilter(
    'relevantSupportlines',
    (supportlines, portalTags, limit = 9, options) => {
      const opts = options && typeof options === 'object' ? options : {};
      const lines = Array.isArray(supportlines) ? supportlines : [];
      const rawTags = Array.isArray(portalTags) ? portalTags : portalTags ? [portalTags] : [];

      const normalizedTags = rawTags
        .map((t) => normalizePortalTagValue(t))
        .filter(Boolean)
        .filter((t) => t !== 'portal');

      const portalTagSet = new Set(normalizedTags);

      const broadTags = new Set(
        (Array.isArray(opts.broadTags) && opts.broadTags.length
          ? opts.broadTags
          : DEFAULT_BROAD_TAGS
        ).map(normalizePortalTagValue)
      );

      const specificTags = new Set(normalizedTags.filter((t) => !broadTags.has(t)));

      const tagWeights = {
        suicid: 5,
        sjalvskada: 5,
        valdbrott: 4,
        vald: 4,
        trauma: 4,
        sorg: 3,
        angest: 3,
        missbruk: 3,
        spelproblem: 3,
        'barn-unga': 3,
        akut: 2,
        anhorig: 2,
        anhoriga: 2,
        'killar-man': 2,
        hbtqi: 2,
        stodgrupp: 1,
        myndighet: 1
      };

      const hintedCategories = new Set();
      if (portalTagSet.has('valdbrott') || portalTagSet.has('vald')) hintedCategories.add('vald');
      if (portalTagSet.has('missbruk') || portalTagSet.has('spelproblem'))
        hintedCategories.add('missbruk');
      if (portalTagSet.has('barn-unga') || portalTagSet.has('ungdom'))
        hintedCategories.add('barn-unga');
      if (portalTagSet.has('anhorig') || portalTagSet.has('anhoriga'))
        hintedCategories.add('anhoriga');
      if (portalTagSet.has('aldre')) hintedCategories.add('aldre');

      if (
        hintedCategories.size === 0 &&
        (portalTagSet.has('psykiskohalsa') ||
          portalTagSet.has('suicid') ||
          portalTagSet.has('sjalvskada') ||
          portalTagSet.has('angest') ||
          portalTagSet.has('trauma') ||
          portalTagSet.has('sorg') ||
          portalTagSet.has('depression'))
      ) {
        hintedCategories.add('psykiskohalsa');
      }

      const scoreLine = (line) => {
        const lineTags = new Set(line?.tags ?? []);
        let matchCount = 0;
        let matchScore = 0;
        for (const tag of specificTags) {
          if (lineTags.has(tag)) {
            matchCount += 1;
            matchScore += tagWeights[tag] ?? 1;
          }
        }

        let score = matchScore * 10;
        if (line?.urgent) score += 2;
        if (hintedCategories.has(line?.category)) score += 3;
        if (portalTagSet.has('akut') && lineTags.has('akut')) score += 2;

        return { line, score, matchCount };
      };

      const scored = lines.map(scoreLine);

      let candidates = scored.filter((x) => x.score > 0);

      const allowCategoryFallback = opts.allowCategoryFallback !== false;
      if (allowCategoryFallback && candidates.length === 0 && hintedCategories.size > 0) {
        candidates = scored.filter((x) => hintedCategories.has(x.line?.category));
      }

      candidates.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (Number(Boolean(b.line?.urgent)) !== Number(Boolean(a.line?.urgent))) {
          return Number(Boolean(b.line?.urgent)) - Number(Boolean(a.line?.urgent));
        }
        if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
        return String(a.line?.name ?? '').localeCompare(String(b.line?.name ?? ''), 'sv');
      });

      const max = Math.max(1, Number(limit) || 9);
      return candidates.slice(0, max).map((x) => x.line);
    }
  );

  // Render safe inline markdown (useful for references list items)
  const mdInline = new MarkdownIt({ html: false, linkify: true, breaks: false });
  eleventyConfig.addFilter('mdInline', (value) => mdInline.renderInline(String(value ?? '')));

  // Shortcode för årtal (för copyright etc)
  eleventyConfig.addShortcode('year', () => `${new Date().getFullYear()}`);

  const backendBaseUrl =
    process.env.MITTPSYKE_BACKEND_BASE_URL ||
    process.env.MITTPSYKE_API_BASE_URL ||
    'http://127.0.0.1:8000';

  const proxyPrefixes = ['/accounts/', '/api/', '/admin/', '/static/', '/media/'];

  eleventyConfig.setServerOptions({
    // Disable Eleventy's DOM diffing for proxied pages (prevents injection issues)
    domDiff: false,
    middleware: [
      function (req, res, next) {
        if (!req.url) return next();

        const requestUrl = new URL(req.url, `http://${req.headers.host}`);
        const shouldProxy = proxyPrefixes.some((prefix) => requestUrl.pathname.startsWith(prefix));
        if (!shouldProxy) return next();

        // Mark response as handled to prevent Eleventy from processing it further
        res._eleventyProxied = true;

        const targetUrl = new URL(req.url, backendBaseUrl);
        const client = targetUrl.protocol === 'https:' ? https : http;

        const proxyReq = client.request(
          {
            protocol: targetUrl.protocol,
            hostname: targetUrl.hostname,
            port: targetUrl.port,
            method: req.method,
            path: `${targetUrl.pathname}${targetUrl.search}`,
            headers: {
              ...req.headers,
              host: targetUrl.host
            }
          },
          (proxyRes) => {
            // Copy headers but filter out problematic ones
            const headers = { ...proxyRes.headers };
            // Remove transfer-encoding to avoid chunked encoding conflicts
            delete headers['transfer-encoding'];
            
            // Collect the full response body before sending
            const chunks = [];
            proxyRes.on('data', (chunk) => chunks.push(chunk));
            proxyRes.on('end', () => {
              const body = Buffer.concat(chunks);
              headers['content-length'] = body.length;
              
              if (!res.headersSent) {
                res.writeHead(proxyRes.statusCode || 502, headers);
              }
              res.end(body);
            });
          }
        );

        proxyReq.on('error', (error) => {
          if (!res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'text/plain' });
          }
          res.end(`Proxy error: ${error.message}`);
        });

        req.pipe(proxyReq, { end: true });
      }
    ]
  });

  return {
    dir: {
      input: 'src',
      output: 'site',
      includes: '_includes',
      data: '_data'
    },
    templateFormats: ['njk', 'md', 'html'],
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk'
  };
};
