'use strict';

const postcss = require('postcss');
const postcssImport = require('postcss-import');
const postcssUrl = require('postcss-url');
const cssnext = require('postcss-cssnext');
const reporter = require('postcss-reporter');
const path = require('path');

module.exports = {
  jade: {
    basedir: path.resolve(__dirname, 'src')
  },
  postcss: [ postcssImport, postcssUrl, cssnext, reporter ],
  cssnext: {
    url: {
      url: 'inline'
    },
    compress: true,
    warnForDuplicates: false
  }
};
