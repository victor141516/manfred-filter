#!/usr/bin/env bash

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
cd "$(dirname $SCRIPT_DIR)/manfred-filter"
/usr/bin/env node --experimental-specifier-resolution=node index.js "$@"
