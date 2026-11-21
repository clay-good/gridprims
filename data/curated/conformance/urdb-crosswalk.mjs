// Which record in the open tariff database (URDB) each regulator-priced schedule is compared with
// (add-tariff-conformance-suite 3.1). A schedule is matched only when the utility has exactly one current
// general residential record, or one whose name gives the same schedule; where URDB offers single- and
// three-phase versions, the single-phase one is taken, as typical residential service. Every other schedule
// is untestable, with why, and counts in no accuracy figure. Read from the URDB 2026-10 snapshot on 2026-11-21.

export const CHECKED = '2026-11-21';
export const URDB_VERSION = '2026-10';

export default [
  { state: 'LA', utility: 'BEAUREGARD', schedule: 'Schedule RS', urdb: '539f6cf9ec4f024411ecb00d', why: 'URDB\'s "Residential Single Phase" record; its three-phase twin cites the same Schedule RS sheet' },
  { state: 'LA', utility: 'CLAIBORNE', schedule: 'Schedule A', urdb: '539fcac1ec4f024d2f53fef6', why: 'URDB\'s one residential record for Claiborne Electric Coop' },
  { state: 'LA', utility: 'CLECO', schedule: 'Schedule RS', urdb: '68a0e45a5d08cbe7b70ed13a', why: 'URDB\'s "Residential Service" record, Cleco\'s Schedule RS; the other current record is the time-of-use TOUCH program' },
  { state: 'LA', utility: 'CONCORDIA', schedule: 'Schedule A', urdb: '53bae8bd5257a3ba130b9a71', why: 'URDB\'s "Farm & Home Service - Single Phase" record; the others are three-phase and camps' },
  { state: 'LA', utility: 'DEMCO', schedule: 'Schedule R', untestable: 'URDB\'s residential records for Dixie Electric Membership Corp name Schedules A, AWS, FH, S, and RTU, none of them Schedule R, the schedule the commission prices' },
  { state: 'LA', utility: 'Entergy Louisiana', schedule: 'Schedule RS-G (Legacy EGSL)', urdb: '69a99f187cef8411ae01894b', why: 'URDB\'s one current general residential record for Entergy Louisiana, "Residential Service (RS)", effective 2026-03-02; the commission prices two legacy versions of RS, and both are compared with it' },
  { state: 'LA', utility: 'Entergy Louisiana', schedule: 'Schedule RS-L (Legacy ELL)', urdb: '69a99f187cef8411ae01894b', why: 'URDB\'s one current general residential record for Entergy Louisiana, "Residential Service (RS)", effective 2026-03-02; the commission prices two legacy versions of RS, and both are compared with it' },
  { state: 'LA', utility: 'JEFFERSON DAVIS', schedule: 'Schedule A', untestable: 'URDB\'s records for Jefferson Davis Electric Coop name Schedules AA and AE, not Schedule A, the schedule the commission prices' },
  { state: 'LA', utility: 'NORTHEAST', schedule: 'Schedule A', urdb: '53dfa0745257a39542bfd38a', why: 'URDB\'s one residential record for Northeast Louisiana Power Coop, "Farm and Home Service"' },
  { state: 'LA', utility: 'PANOLA-HARRISON', schedule: 'Schedule R', urdb: '53d95b695257a379669598a6', why: 'URDB\'s one Louisiana residential record for Panola-Harrison Electric Coop, "Rate Schedule - Residential"' },
  { state: 'LA', utility: 'POINTE COUPEE', schedule: 'Schedule 100/101', urdb: '539fb6e9ec4f024bc1dc05a1', why: 'URDB\'s "Residential Service - Single Phase" record; the other is three-phase' },
  { state: 'LA', utility: 'SLECA', schedule: 'Schedule A', urdb: '539f6cb6ec4f024411ecad2b', why: 'URDB\'s "Farm, Home or Residential Service" record for South Louisiana Electric Coop; the other is camp or remote service' },
  { state: 'LA', utility: 'SLEMCO', schedule: 'Schedule 01', urdb: '539f736aec4f024411ecfc7d', why: 'URDB\'s "SLEMCO-Rate 01 Regular residential rate" record' },
  { state: 'LA', utility: 'SLEMCO', schedule: 'Schedule 05', urdb: '539f713aec4f024411ece355', why: 'URDB\'s "SLEMCO-Rate 5 All electric residential rate" record' },
  { state: 'LA', utility: 'SWEPCO', schedule: 'Schedule RS', urdb: '693b7078267a6b77a003a27b', why: 'URDB\'s "RS - Residential Service" record for Southwestern Electric Power Co (Louisiana)' },
  { state: 'LA', utility: 'WASHINGTON-ST.TAMMANY', schedule: 'Schedule A-5', urdb: '539f7180ec4f024411ece665', why: 'URDB\'s one residential record for Washington-St. Tammany Electric Coop, "Farm and House"; it does not name Schedule A-5' },
];
