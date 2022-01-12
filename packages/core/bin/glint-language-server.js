#!/usr/bin/env node
/* eslint-disable */

// Despite the fact that we're only using Babel for parsing,
// it implicitly loads Browserslist, which can trigger a
// warning to stdout (breaking our LSP interactions) for
// users with an older lockfile.
process.env.BROWSERSLIST_IGNORE_OLD_DATA = 'true';

require('../lib/language-server');
