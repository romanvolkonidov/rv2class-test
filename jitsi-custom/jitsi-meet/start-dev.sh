#!/bin/bash
cd "$(dirname "$0")"
./node_modules/.bin/webpack serve --mode development --progress
