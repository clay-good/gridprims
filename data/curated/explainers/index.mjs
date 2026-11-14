// The Learn explainers (add-learn-and-data-guides: guides), in the order the
// Learn section lists them. Every number is generated from a registered
// dataset at build, or cited with a source and a date, or labeled an example
// value (verify/gates/explainers.mjs).

import balancingAuthority from './balancing-authority.mjs';
import dataCenterRequest from './data-center-request.mjs';
import publicData from './public-data.mjs';
import demandCharges from './demand-charges.mjs';
import timeOfUse from './time-of-use.mjs';
import coincidentPeaks from './coincident-peaks.mjs';
import meterData from './meter-data.mjs';
import billHigh from './bill-high.mjs';
import rateCase from './rate-case.mjs';
import hourlyEmissions from './hourly-emissions.mjs';
import powerSources from './power-sources.mjs';

export default [billHigh, timeOfUse, demandCharges, coincidentPeaks, meterData, rateCase, dataCenterRequest, hourlyEmissions, balancingAuthority, powerSources, publicData];
