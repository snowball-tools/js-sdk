#!/bin/bash
rm -rf dist
npx tsup "$@" --dts --format esm,cjs --sourcemap
