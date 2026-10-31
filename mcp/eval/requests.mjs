// The agent evaluation set (agent/mcp-server, "Agent evaluation"): realistic
// developer requests with the tool call an agent should make and the key
// values it should get back. CI checks the parts that need no model; running
// the set through a model is optional and advisory, and its record lives in
// mcp/eval/model-runs.json.
//
// Paths in `expect` are dot paths into the structured result. `{fixture:x}` in
// an argument names a file in verify/fixtures/intake/files.

export const FAMILIES = ['calc', 'load', 'data', 'report', 'catalog'];

export default [
  { id: 'calc-mwh-mmbtu', family: 'calc', request: 'How many MMBtu is 12 MWh?', tool: 'gridprims_run', arguments: { tool: 'calc.energy-units.convert', inputs: { value: 12, from: 'MWh', to: 'MMBtu' } }, expect: { 'outputs.value.display': '40.95', 'outputs.value.unit': 'MMBtu', validationLevel: 2 } },
  { id: 'calc-gas-btu', family: 'calc', request: 'Convert 1,000 cubic feet of natural gas to Btu and tell me where the factor comes from.', tool: 'gridprims_run', arguments: { tool: 'calc.energy-units.convert', inputs: { value: 1000, from: 'ft3-natural-gas', to: 'Btu' } }, expect: { 'outputs.value.display': '1,036,000', sentence: '1,000 ft³ of natural gas is about 1,036,000 Btu.' } },
  { id: 'calc-find-tool', family: 'catalog', request: 'Is there a tool to turn therms into kilowatt-hours?', tool: 'gridprims_search', arguments: { query: '2 therms to kWh' }, expect: { 'results.0.id': 'calc.energy-units.convert', 'results.0.inputs.from': 'therm', 'results.0.inputs.to': 'kWh' } },
  { id: 'calc-describe', family: 'catalog', request: 'What inputs does the energy converter take, and how well checked is it?', tool: 'gridprims_describe', arguments: { tool: 'calc.energy-units.convert' }, expect: { validationLevel: 2, stability: 'stable', 'inputs.0.name': 'value' } },
  { id: 'load-peak', family: 'load', request: 'What was the peak demand in this Smart Meter Texas export, and when?', tool: 'gridprims_analyze_file', arguments: { path: '{fixture:smart-meter-texas.csv}', zone: 'America/Chicago' }, expect: { 'receipt.time.intervalMinutes': 15, 'series.0.channel': 'delivered', 'series.1.channel': 'received' } },
  { id: 'load-dst', family: 'load', request: 'Does this file handle the November daylight-saving hour correctly?', tool: 'gridprims_analyze_file', arguments: { path: '{fixture:dst-fall-back.csv}', zone: 'America/Chicago' }, expect: { 'receipt.quality.repeatedIntervalsKept': 4, 'series.0.intervals': 100 } },
  { id: 'data-vermont', family: 'data', request: 'Which utilities sold power in Vermont in 2025, according to EIA?', tool: 'gridprims_query_data', arguments: { dataset: 'eia-861', filter: { state: 'VT' }, limit: 500 }, expect: { 'dataset.publisher': 'U.S. Energy Information Administration', 'dataset.dataPeriod': '2025' } },
  { id: 'report-prepare', family: 'report', request: 'The coal conversion looks low to me. Can you file that?', tool: 'gridprims_prepare_report', arguments: { tool: 'calc.energy-units.convert', message: 'The coal conversion looks low.' }, expect: { 'payload.toolId': 'calc.energy-units.convert', 'payload.message': 'The coal conversion looks low.' } },
];
