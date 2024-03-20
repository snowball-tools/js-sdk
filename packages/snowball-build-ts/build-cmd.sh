#!/bin/bash
npx tsup "$@" --dts --format esm,cjs --sourcemap
