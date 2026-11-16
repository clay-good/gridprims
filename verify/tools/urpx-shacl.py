# Checks the tariffs core/lib/urpx.mjs writes against the URPX v0.5.1 SHACL
# shapes and ontology with pySHACL, and records each document's SHA-256 with
# the result, so CI can tell an emitter change from a validated one without
# running RDF tooling (add-tariff-conformance-suite task 2.1). Only the
# results are stored; pySHACL and the URPX repository are never bundled.
# Dev-time only, with pySHACL 0.30.1 and rdflib 7.6.0 under Python 3.14:
#   git clone --depth 1 --branch v0.5.1 https://github.com/urpx-org/urpx.git /tmp/urpx
#   node verify/tools/urpx-emit.mjs /tmp/urpx-out
#   python -I verify/tools/urpx-shacl.py /tmp/urpx /tmp/urpx-out > verify/reference/urpx/shacl-results.json
import hashlib, json, pathlib, subprocess, sys
import pyshacl, rdflib
from rdflib import Graph
from pyshacl import validate

repo, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
context = json.loads((repo / 'context/urpx-context.jsonld').read_text())['@context']
shapes = Graph().parse(repo / 'shacl/urpx-shacl.ttl', format='turtle')
ontology = Graph().parse(repo / 'ontology/urpx-ontology.ttl', format='turtle')
commit = subprocess.run(['git', '-C', str(repo), 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip()

def graph(f):
    doc = json.loads(f.read_text())
    # The published context URL is replaced by the repository's own copy, so nothing is fetched.
    doc['@context'] = [context if isinstance(c, str) and 'urpx-context' in c else c for c in doc['@context']]
    return Graph().parse(data=json.dumps(doc), format='json-ld')

# Every document is parsed before any is validated: the RDFS inference registers a datatype converter that
# cannot read gMonth values such as "--06", so a document parsed after a validation would be misread.
graphs = {f: graph(f) for f in sorted(out.glob('*.jsonld'))}
cases = {}
for f, g in graphs.items():
    ok, _, text = validate(g, shacl_graph=shapes, ont_graph=ontology, inference='rdfs', advanced=True)
    cases[f.stem] = {'sha256': sha(f), 'conforms': ok, 'triples': len(g), **({} if ok else {'report': text[:2000]})}

print(json.dumps({
    'urpx': {'tag': 'v0.5.1', 'commit': commit, 'shacl_sha256': sha(repo / 'shacl/urpx-shacl.ttl'), 'ontology_sha256': sha(repo / 'ontology/urpx-ontology.ttl'), 'context_sha256': sha(repo / 'context/urpx-context.jsonld')},
    'pyshacl': pyshacl.__version__, 'rdflib': rdflib.__version__,
    'cases': cases,
}, indent=2))
