'use strict';

const pify = require('pify');
const glob = pify(require('glob'));
const path = require('path');
const YAML = require('yamljs');

function pathToArray(pathStr, array = []) {
  const dirName = path.dirname(pathStr);
  if (dirName === pathStr) return array;
  array.unshift(path.basename(pathStr));
  return pathToArray(dirName, array);
}

glob('./yaml/**/*.yml')
.then((files) => {
  const deviceList = {};
  files.map((f) => pathToArray(f))
    .filter((fa) => fa.length === 3)
    .forEach((fa) => {
      if (!deviceList[ fa[1] ]) deviceList[ fa[1] ] = [];
      deviceList[ fa[1] ].push( path.basename(fa[2], '.yml') );
    });
  return deviceList;
})
.then((deviceList) => {
  console.log(YAML.stringify(deviceList, Number.MAX_SAFETY_INTEGER, 2));
})
.catch((err) => console.error(err.stack || err));
