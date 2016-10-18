#!/bin/bash

ls ./json/echonetlite | \
xargs -I{} basename -s .json {} | \
xargs -I{} bash -c \
  'node convert.js ./json/echonetlite/{}.json > ./yaml/echonetlite/{}.yml'
