#!/bin/bash

# Only rm if NO_CLEAN is not set
# Useful to set during development to avoid VSCode losing type information
if [ -z "$NO_CLEAN" ]; then
  rm -rf dist
fi

npx tsup "$@" --dts --format esm,cjs --sourcemap
