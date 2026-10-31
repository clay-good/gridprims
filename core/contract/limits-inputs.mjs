// The curated inputs to the limits record, imported the same way by the site
// build and the MCP server (Node-only callers add the health record and
// dataset manifests they read from disk).

import cannotDo from '../../data/curated/cannot-do.mjs';
import claims from '../../data/curated/claims.mjs';

export { cannotDo, claims };
