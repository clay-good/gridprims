// Our bill engine's tariff written as URPX, the LF Energy tariff interchange
// format (add-tariff-conformance-suite design D2): JSON-LD a URPX reader or
// the SHACL shapes can check: a fixed charge by month or day, a monthly
// minimum, energy by season and tier, and time-of-use energy when the
// weekday and weekend hour schedules come along. Daily tier allowances are
// not written yet; the function refuses them rather than writing them partly.

export const URPX_VERSION = 'v0.5.1';
export const URPX_CONTEXT = `https://urpx.org/ns/context/releases/${URPX_VERSION}/jsonld/urpx-context.jsonld`;
const ONTOLOGY = `https://github.com/urpx-org/urpx/raw/${URPX_VERSION}/ontology/urpx-ontology.ttl`;
const ref = (id) => ({ '@id': id });
const MONTHS = ['--01', '--02', '--03', '--04', '--05', '--06', '--07', '--08', '--09', '--10', '--11', '--12'];

/** The months each season covers: from its start month up to the next season's start, wrapping the year. */
function seasonMonths(seasons) {
  const starts = seasons.map((s) => Number(String(s.from ?? '01-01').slice(0, 2)) - 1);
  return seasons.map((_, i) => {
    const out = [];
    const end = starts[(i + 1) % starts.length];
    for (let m = starts[i]; out.length < 12; m = (m + 1) % 12) { out.push(MONTHS[m]); if ((m + 1) % 12 === end) break; }
    return seasons.length === 1 ? MONTHS : out;
  });
}

/**
 * The charge types a tariff exercises, in the conformance suite's words.
 * @param {{fixedMonthly?: number, fixedDaily?: number, minimumMonthly?: number, seasons: any[]}} t
 */
export function chargeTypesOf(t) {
  const types = [];
  if (t.fixedMonthly || t.fixedDaily) types.push('fixed');
  if (t.seasons.some((s) => s.periods)) types.push('tou-energy');
  if (t.seasons.some((s) => (s.tiers?.length ?? 0) > 1)) types.push('tiered-energy');
  const rates = new Set(t.seasons.map((s) => JSON.stringify(s.tiers ?? s.periods)));
  if (rates.size > 1) types.push('seasonal-energy');
  if (t.minimumMonthly) types.push('minimum-bill');
  if (t.charges?.length) types.push('rider');
  if (!types.some((x) => x.endsWith('-energy')) && t.seasons.length && t.seasons.every((s) => s.tiers?.length === 1)) types.push('flat-energy');
  return types;
}

const hh = (h) => `${String(h % 24).padStart(2, '0')}:00:00`;

/** Runs of consecutive hours in one day's 24 period indices that use period p: [start, end) hours. */
function runs(day, p) {
  const out = [];
  for (let h = 0; h < 24; h++) {
    if (day[h] !== p) continue;
    if (out.length && out.at(-1)[1] === h) out.at(-1)[1] = h + 1;
    else out.push([h, h + 1]);
  }
  return out;
}

/**
 * A tariff as a URPX package, or the reason it cannot be written yet.
 * @param {{fixedMonthly?: number, fixedDaily?: number, minimumMonthly?: number, seasons: Array<{name: string, from?: string, tiers?: Array<{rate: number, upTo?: number, upToDaily?: number}>, periods?: any[]}>}} t
 * @param {{id: string, name: string, utility: string, effective: string, zone?: string, source?: {url: string, retrieved: string}}} meta
 * @param {{schedule?: {weekday: number[][], weekend: number[][]}}} [opts] URDB's 12 × 24 period indices, for time-of-use
 * @returns {{document: any} | {error: string}}
 */
export function toUrpx(t, meta, { schedule } = {}) {
  const tou = t.seasons.some((s) => s.periods);
  if (tou && !(schedule?.weekday?.length === 12 && schedule?.weekend?.length === 12)) return { error: 'time-of-use periods need the weekday and weekend hour schedules to be written as URPX' };
  if (t.seasons.some((s) => s.tiers?.some((x) => x.upToDaily !== undefined))) return { error: 'daily tier allowances are not written as URPX yet' };
  const ns = 'gp';
  const id = (local) => `${ns}:${meta.id}-${local}`;
  const many = t.seasons.length > 1;
  const months = seasonMonths(t.seasons);
  const seasonId = (i) => id(`season-${i + 1}`);
  const tierCount = tou ? 1 : Math.max(...t.seasons.map((s) => s.tiers.length));

  const ledgers = [
    { '@type': 'urpx:Ledger', '@id': id('ledger-energy'), 'urpx:name': 'Energy Prices', 'urpx:ledgerType': ref('urpx:bundledLedger'), 'urpx:referencesMetricInput': ref(id('mi-energy')) },
  ];
  const definitions = [
    { '@type': 'urpx:PriceDefinition', '@id': id('pd-energy'), 'urpx:name': 'Energy Charge', 'urpx:chargeType': ref('urpx:usageCharge'), 'urpx:chargeCategory': ref('urpx:auxiliaryCharge'), 'urpx:billPortion': ref('urpx:bundledPortion'), 'urpx:referencesLedger': ref(id('ledger-energy')) },
  ];
  const prices = [];
  const fixed = t.fixedMonthly ?? t.fixedDaily;
  if (fixed) {
    ledgers.push({ '@type': 'urpx:Ledger', '@id': id('ledger-service'), 'urpx:name': 'Service Price', 'urpx:ledgerType': ref('urpx:bundledLedger'), 'urpx:referencesMetricInput': ref(id('mi-meter-count')), 'urpx:hasCalculationMethod': { '@type': 'urpx:CalculationMethod', 'urpx:intervalDuration': t.fixedDaily ? 'P1D' : 'P1M' } });
    definitions.push({ '@type': 'urpx:PriceDefinition', '@id': id('pd-customer'), 'urpx:name': 'Customer Charge', 'urpx:chargeType': ref('urpx:customerCharge'), 'urpx:chargeCategory': ref('urpx:serviceCharge'), 'urpx:billPortion': ref('urpx:bundledPortion'), 'urpx:baseQuantity': '1', 'urpx:referencesLedger': ref(id('ledger-service')) });
    prices.push({ '@type': 'urpx:Price', '@id': id('price-customer'), 'urpx:referencesPriceDefinition': ref(id('pd-customer')), 'urpx:name': 'Customer Charge', 'urpx:startDate': meta.effective, 'urpx:unitPrice': String(fixed) });
  }
  if (t.minimumMonthly) {
    if (!fixed) ledgers.push({ '@type': 'urpx:Ledger', '@id': id('ledger-service'), 'urpx:name': 'Service Price', 'urpx:ledgerType': ref('urpx:bundledLedger'), 'urpx:referencesMetricInput': ref(id('mi-meter-count')), 'urpx:hasCalculationMethod': { '@type': 'urpx:CalculationMethod', 'urpx:intervalDuration': 'P1M' } });
    definitions.push({ '@type': 'urpx:PriceDefinition', '@id': id('pd-minimum'), 'urpx:name': 'Minimum Bill', 'urpx:chargeType': ref('urpx:minimumBill'), 'urpx:chargeCategory': ref('urpx:serviceCharge'), 'urpx:billPortion': ref('urpx:bundledPortion'), 'urpx:baseQuantity': '1', 'urpx:referencesLedger': ref(id('ledger-service')) });
    prices.push({ '@type': 'urpx:Price', '@id': id('price-minimum'), 'urpx:referencesPriceDefinition': ref(id('pd-minimum')), 'urpx:name': 'Minimum Bill', 'urpx:startDate': meta.effective, 'urpx:unitPrice': String(t.minimumMonthly) });
  }
  // Riders: each named charge per kWh on the energy ledger, or per month on the service ledger, in URPX's
  // adjustment category, with the charge type the record names (a power cost adjustment, a fuel charge) or a
  // tariff rider.
  for (const [k, c] of (t.charges ?? []).entries()) {
    const monthly = c.perKwh === undefined;
    if (monthly && !ledgers.some((l) => l['@id'] === id('ledger-service'))) ledgers.push({ '@type': 'urpx:Ledger', '@id': id('ledger-service'), 'urpx:name': 'Service Price', 'urpx:ledgerType': ref('urpx:bundledLedger'), 'urpx:referencesMetricInput': ref(id('mi-meter-count')), 'urpx:hasCalculationMethod': { '@type': 'urpx:CalculationMethod', 'urpx:intervalDuration': 'P1M' } });
    definitions.push({ '@type': 'urpx:PriceDefinition', '@id': id(`pd-rider-${k + 1}`), 'urpx:name': c.label, 'urpx:chargeType': ref(c.urpxType ?? 'urpx:tariffRider'), 'urpx:chargeCategory': ref('urpx:adjustment'), 'urpx:billPortion': ref('urpx:bundledPortion'), ...(monthly ? { 'urpx:baseQuantity': '1' } : {}), 'urpx:referencesLedger': ref(id(monthly ? 'ledger-service' : 'ledger-energy')) });
    prices.push({ '@type': 'urpx:Price', '@id': id(`price-rider-${k + 1}`), 'urpx:referencesPriceDefinition': ref(id(`pd-rider-${k + 1}`)), 'urpx:name': c.label, 'urpx:startDate': meta.effective, 'urpx:unitPrice': String(monthly ? c.monthly : c.perKwh) });
  }
  // Time-of-use: one URPX tier per period of the schedule, and in it one URPX period per season that uses it,
  // with the hours as time brackets (all days when weekdays and weekends match, else each on its own).
  let touSchedule = null;
  if (tou) {
    const tiers = new Map();
    let n = 0;
    t.seasons.forEach((s, i) => {
      const m = Number(String(s.from ?? '01-01').slice(0, 2)) - 1;
      const wd = schedule.weekday[m]; const we = schedule.weekend[m];
      const same = JSON.stringify(wd) === JSON.stringify(we);
      for (const period of s.periods) {
        const p = Number(/(\d+)$/.exec(period.name)?.[1]) - 1;
        const number = ++n;
        const brackets = [];
        const add = (day, dayType) => runs(day, p).forEach(([a, b], k) => brackets.push({ '@type': 'urpx:TimeBracket', '@id': id(`bracket-s${i + 1}-p${p + 1}-${dayType}-${k + 1}`), 'urpx:startTime': hh(a), 'urpx:endTime': hh(b), ...(many ? { 'urpx:appliesInSeason': ref(seasonId(i)) } : {}), 'urpx:dayType': ref(`urpx:${dayType}`) }));
        if (same) add(wd, 'allDays'); else { add(wd, 'weekdayDays'); add(we, 'weekendDays'); }
        const tier = tiers.get(p) ?? tiers.set(p, { '@type': 'urpx:TOUTier', '@id': id(`tou-tier-${p + 1}`), 'urpx:tierSourceName': `Period ${p + 1}`, 'urpx:touTierNumber': p + 1, 'urpx:hasTOUPeriod': [] }).get(p);
        tier['urpx:hasTOUPeriod'].push({ '@type': 'urpx:TOUPeriod', '@id': id(`tou-period-${number}`), 'urpx:name': `${s.name}, period ${p + 1}`, 'urpx:touPeriodNumber': number, 'urpx:hasTimeBracket': brackets });
        definitions.push({ '@type': 'urpx:PriceDefinition', '@id': id(`pd-energy-${number}`), 'urpx:name': `Energy, ${s.name}, period ${p + 1}`, 'urpx:chargeType': ref('urpx:usageCharge'), 'urpx:chargeCategory': ref('urpx:auxiliaryCharge'), 'urpx:billPortion': ref('urpx:bundledPortion'), 'urpx:touPeriodNumber': number, 'urpx:referencesLedger': ref(id('ledger-energy')) });
        prices.push({ '@type': 'urpx:Price', '@id': id(`price-energy-${number}`), 'urpx:referencesPriceDefinition': ref(id(`pd-energy-${number}`)), 'urpx:name': `Energy, ${s.name}, period ${p + 1}`, 'urpx:startDate': meta.effective, 'urpx:unitPrice': String(period.rate), ...(many ? { 'urpx:appliesInSeason': ref(seasonId(i)) } : {}) });
      }
    });
    touSchedule = { '@type': 'urpx:TOUSchedule', '@id': id('tou'), 'urpx:referencesMetricInput': ref(id('mi-energy')), 'urpx:hasTOUTier': [...tiers.values()].sort((a, b) => a['urpx:touTierNumber'] - b['urpx:touTierNumber']) };
    definitions.splice(definitions.findIndex((d) => d['@id'] === id('pd-energy')), 1);
  }
  if (!tou) t.seasons.forEach((s, i) => s.tiers.forEach((tier, k) => {
    prices.push({
      '@type': 'urpx:Price', '@id': id(`price-energy-s${i + 1}-t${k + 1}`), 'urpx:referencesPriceDefinition': ref(id('pd-energy')),
      'urpx:name': `Energy, ${s.name}${tierCount > 1 ? `, tier ${k + 1}` : ''}`, 'urpx:startDate': meta.effective, 'urpx:unitPrice': String(tier.rate),
      ...(tierCount > 1 ? { 'urpx:serviceTierNumber': k + 1 } : {}), ...(many ? { 'urpx:appliesInSeason': ref(seasonId(i)) } : {}),
    });
  }));

  // Tiers: each season's brackets in cumulative kWh a month, the last open-ended.
  const serviceTiers = tierCount > 1 ? [{
    '@type': 'urpx:ServiceTiers', '@id': id('tiers'), 'urpx:referencesMetricInput': ref(id('mi-energy')),
    'urpx:hasServiceTier': Array.from({ length: tierCount }, (_, k) => ({
      '@type': 'urpx:ServiceTier', '@id': id(`tier-${k + 1}`), 'urpx:name': `Tier ${k + 1}`, 'urpx:serviceTierNumber': k + 1,
      'urpx:hasServiceBracket': t.seasons.flatMap((s, i) => {
        if (!s.tiers[k]) return [];
        const lower = s.tiers.slice(0, k).reduce((sum, x) => sum + (x.upTo ?? 0), 0);
        return [{
          '@type': 'urpx:ServiceBracket', '@id': id(`bracket-s${i + 1}-t${k + 1}`), ...(many ? { 'urpx:appliesInSeason': ref(seasonId(i)) } : {}),
          'urpx:lowerBound': String(lower), 'urpx:lowerBoundOperator': ref(k ? 'urpx:greaterThanOperator' : 'urpx:greaterThanOrEqualOperator'),
          ...(s.tiers[k].upTo !== undefined ? { 'urpx:upperBound': String(Number((lower + s.tiers[k].upTo).toFixed(6))), 'urpx:upperBoundOperator': ref('urpx:lessThanOrEqualOperator') } : {}),
        }];
      }),
    })),
  }] : [];

  const version = {
    '@type': 'urpx:RatePlanVersion', '@id': id('version'),
    'urpx:offeredBy': { '@type': 'urpx:UtilityOperator', '@id': id('utility'), 'urpx:legalName': meta.utility, 'urpx:organizationType': ref('urpx:utilityOrganization') },
    'urpx:effectiveDateTime': `${meta.effective}T00:00:00`, 'urpx:priceCurrency': 'USD', 'urpx:commodity': ref('urpx:electricity'),
    'urpx:serviceRole': ref('urpx:bundledServiceRole'), 'urpx:forRatePlan': ref(id('plan')),
    // We write what our engine's record holds, not the whole tariff sheet, so completeness is not claimed.
    'urpx:changeReason': ref('urpx:changeReasonOther'),
    'urpx:hasCoverageClaim': { '@type': 'urpx:CoverageClaim', '@id': id('coverage'), 'urpx:completenessResult': ref('urpx:unknown'), 'urpx:selfContained': true, 'urpx:explainedBy': { '@type': 'urpx:Evaluation', '@id': id('evaluation'), 'urpx:description': t.charges?.length ? 'Written by gridprims from the tariff record its bill engine prices: the fixed charge, any monthly minimum, energy by season, tier, and time-of-use period, and the riders the record names, per kWh or per month. Taxes and anything else on the tariff sheet that the record does not hold are not included, so completeness is not claimed.' : 'Written by gridprims from the tariff record its bill engine prices: the fixed charge, any monthly minimum, and energy by season, tier, and time-of-use period. Riders, taxes, and anything else on the tariff sheet that the record does not hold are not included, so completeness is not claimed.' } },
    ...(meta.source ? { 'urpx:hasDataSourceReference': { '@type': 'urpx:DataSourceReference', 'urpx:url': meta.source.url, 'urpx:dateRetrieved': meta.source.retrieved } } : {}),
    'urpx:hasPlanElements': {
      '@type': 'urpx:PlanElements',
      ...(many ? { 'urpx:hasSeasons': t.seasons.map((s, i) => ({ '@type': 'urpx:Season', '@id': seasonId(i), 'urpx:seasonName': s.name, 'urpx:month': months[i] })) } : {}),
      'urpx:hasMetricInput': [
        { '@type': 'urpx:MetricInput', '@id': id('mi-energy'), 'urpx:name': 'kWh Energy Consumption', 'urpx:metricInputType': ref('urpx:measuredMetricInput'), 'urpx:hasMetricSpecification': { '@type': 'urpx:MetricSpecification', '@id': id('ms-energy'), 'urpx:measurementKind': ref('urpx:energy'), 'urpx:unitOfMeasure': ref('urpx:kWh') } },
        ...(fixed || t.minimumMonthly || t.charges?.some((c) => c.perKwh === undefined) ? [{ '@type': 'urpx:MetricInput', '@id': id('mi-meter-count'), 'urpx:name': 'Per Meter', 'urpx:metricInputType': ref('urpx:profileMetricInput'), 'urpx:profileMetricProperty': ref('urpx:meterCount') }] : []),
      ],
      'urpx:hasBillingModel': { '@type': 'urpx:BillingModel', ...(touSchedule ? { 'urpx:hasTOUSchedule': touSchedule } : {}), 'urpx:hasLedger': ledgers, 'urpx:hasPriceDefinition': definitions, ...(serviceTiers.length ? { 'urpx:hasServiceTiers': serviceTiers } : {}) },
    },
    'urpx:hasPrices': { '@type': 'urpx:Prices', 'urpx:hasPrice': prices },
  };
  return {
    document: {
      '@context': [URPX_CONTEXT, { [ns]: 'https://gridprims.com/urpx/' }],
      '@graph': [
        { '@type': 'urpx:URPXPackage', '@id': id('package'), 'urpx:targetURPXVersion': ONTOLOGY, 'urpx:hasRatePlan': { '@type': 'urpx:RatePlan', '@id': id('plan'), 'urpx:ratePlanUniqueIdentifier': meta.id, 'urpx:name': meta.name, 'urpx:initialEffectiveDate': meta.effective, ...(meta.zone ? { 'urpx:timezoneIdentifier': meta.zone } : {}) } },
        version,
      ],
    },
  };
}

const all = (doc, type) => { const out = []; const walk = (x) => { if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === 'object') { if (x['@type'] === type) out.push(x); Object.values(x).forEach(walk); } }; walk(doc); return out; };
const idOf = (x) => (x && typeof x === 'object' ? x['@id'] : x);

/**
 * A URPX document read back into the bill engine's tariff, for the subset toUrpx writes: a fixed charge, a
 * monthly minimum, energy by season and tier or by time-of-use period, and riders per kWh or per month. Anything else on a price is named
 * as unsupported rather than skipped, so a vector the engine cannot price is reported, not mispriced.
 * @param {any} doc
 * @returns {{tariff: any} | {error: string}}
 */
export function fromUrpx(doc) {
  const defs = new Map(all(doc, 'urpx:PriceDefinition').map((d) => [d['@id'], d]));
  const ledgers = new Map(all(doc, 'urpx:Ledger').map((l) => [l['@id'], l]));
  const seasonNodes = all(doc, 'urpx:Season');
  const seasons = seasonNodes.length
    ? seasonNodes.map((s) => ({ id: s['@id'], name: s['urpx:seasonName'], from: `${[].concat(s['urpx:month'])[0].slice(2)}-01` }))
    : [{ id: null, name: 'all year', from: '01-01' }];
  const touPeriods = new Map(all(doc, 'urpx:TOUTier').flatMap((t) => (t['urpx:hasTOUPeriod'] ?? []).map((p) => [p['urpx:touPeriodNumber'], t['urpx:touTierNumber']])));
  const brackets = all(doc, 'urpx:ServiceTier').flatMap((t) => (t['urpx:hasServiceBracket'] ?? []).map((b) => ({ tier: t['urpx:serviceTierNumber'], season: idOf(b['urpx:appliesInSeason']) ?? null, lower: Number(b['urpx:lowerBound']), upper: b['urpx:upperBound'] === undefined ? null : Number(b['urpx:upperBound']) })));
  const tariff = { seasons: seasons.map((s) => ({ name: s.name, from: s.from })) };
  const unsupported = [];
  const seasonFor = (p) => { const id = idOf(p['urpx:appliesInSeason']); const i = id ? seasons.findIndex((s) => s.id === id) : 0; return i < 0 ? null : i; };
  for (const p of all(doc, 'urpx:Price')) {
    const d = defs.get(idOf(p['urpx:referencesPriceDefinition']));
    const type = idOf(d?.['urpx:chargeType']);
    const rate = Number(p['urpx:unitPrice']);
    if (type === 'urpx:customerCharge') {
      const daily = ledgers.get(idOf(d['urpx:referencesLedger']))?.['urpx:hasCalculationMethod']?.['urpx:intervalDuration'] === 'P1D';
      tariff[daily ? 'fixedDaily' : 'fixedMonthly'] = rate;
    } else if (type === 'urpx:minimumBill') tariff.minimumMonthly = rate;
    else if (idOf(d?.['urpx:chargeCategory']) === 'urpx:adjustment') {
      const ledger = ledgers.get(idOf(d['urpx:referencesLedger']));
      const perMeter = ledger?.['urpx:hasCalculationMethod']?.['urpx:intervalDuration'] === 'P1M';
      (tariff.charges ??= []).push({ label: p['urpx:name'], ...(perMeter ? { monthly: rate } : { perKwh: rate }), ...(type !== 'urpx:tariffRider' ? { urpxType: type } : {}) });
    }
    else if (type === 'urpx:usageCharge') {
      const i = seasonFor(p);
      if (i === null) { unsupported.push(`${p['urpx:name']}: a season that is not defined`); continue; }
      const s = tariff.seasons[i];
      if (d['urpx:touPeriodNumber'] !== undefined) {
        const tier = touPeriods.get(d['urpx:touPeriodNumber']);
        (s.periods ??= []).push({ name: `period ${tier}`, rate });
      } else {
        const k = p['urpx:serviceTierNumber'] ?? 1;
        const b = brackets.find((x) => x.tier === k && (x.season === seasons[i].id || x.season === null));
        (s.tiers ??= [])[k - 1] = { rate, ...(b?.upper !== null && b ? { upTo: Number((b.upper - b.lower).toFixed(6)) } : {}) };
      }
    } else unsupported.push(`${p['urpx:name'] ?? p['@id']}: charge type ${type ?? 'none'}`);
  }
  if (unsupported.length) return { error: `not read by the bill engine: ${unsupported.join('; ')}` };
  return { tariff };
}
