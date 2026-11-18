#!/usr/bin/env python3
"""Recount EIA-860M project stages without gridprims' JavaScript (projects/stages).

Reads the published generators file with the Python standard library and writes
the figures verify/tests/core/project-stages.test.mjs compares with the build.

    python3 -I verify/tools/project-stages.py data/eia-860m/2026-10 > verify/reference/eia-860m-2026-10-project-stages.json
"""

import csv
import gzip
import hashlib
import json
import sys
from collections import defaultdict
from decimal import Decimal
from pathlib import Path

STAGE = {"P": "planned", "L": "waiting", "T": "approved", "U": "building", "V": "building", "TS": "building"}


def main(folder):
    folder = Path(folder)
    manifest = json.loads((folder / "manifest.json").read_text())
    period = manifest["tables"][0]["dataPeriod"]
    year, month = int(period[:4]), int(period[5:7])
    newest = year * 12 + month - 1
    raw = (folder / "generators.csv.gz").read_bytes()
    rows = csv.DictReader(gzip.decompress(raw).decode("utf-8").splitlines())

    def blank():
        return {"generators": 0, "plants": set(), "mw": Decimal("0")}

    stages = defaultdict(blank)
    states = defaultdict(lambda: defaultdict(Decimal))
    canceled = blank()
    for r in rows:
        mw = Decimal(r["nameplate_mw"] or "0")
        stage = None
        if r["category"] == "planned":
            stage = STAGE[r["status"]]
        elif r["category"] == "operating" and r["operating_year"] and r["operating_month"]:
            age = newest - (int(float(r["operating_year"])) * 12 + int(float(r["operating_month"])) - 1)
            stage = "finished" if 0 <= age < 24 else None
        elif r["category"] == "canceled_or_postponed":
            canceled["generators"] += 1
            canceled["mw"] += mw
        if stage:
            stages[stage]["generators"] += 1
            stages[stage]["plants"].add(r["plant_id"])
            stages[stage]["mw"] += mw
            states[r["state"]][stage] += mw

    out = {
        "source": "U.S. Energy Information Administration, Form EIA-860M, as served in data/eia-860m",
        "release": manifest["version"],
        "inventoryMonth": period,
        "generatorsCsvGzSha256": hashlib.sha256(raw).hexdigest(),
        "method": "Python standard library, decimal arithmetic, independent of gridprims code",
        "stages": {k: {"generators": v["generators"], "plants": len(v["plants"]), "mw": float(v["mw"])} for k, v in sorted(stages.items())},
        "canceledOrPostponed": {"generators": canceled["generators"], "mw": float(canceled["mw"])},
        "stateMw": {s: {k: float(v) for k, v in sorted(d.items())} for s, d in sorted(states.items())},
    }
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main(sys.argv[1])
