#!/bin/sh

rm -rf release
npm run build
mkdir release
cp main.js release/main.js
cp manifest.json release/manifest.json
cp topi/* release/
cp icon.svg release/icon.svg
