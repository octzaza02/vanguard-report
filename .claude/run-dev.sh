#!/bin/bash
export PATH="/c/Program Files/nodejs:$PATH"
cd "/c/Users/hinot/vanguard-report"
exec npm run dev -- -p "${PORT:-3000}"
