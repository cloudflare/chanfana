#!/bin/bash
set -e
npx changeset version
node scripts/sync-template-version.js
