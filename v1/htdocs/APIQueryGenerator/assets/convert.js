'use strict';

if (process.argv.length <= 2) {
  console.error('Require arguments.');
  process.exit();
}

const JSONPath = process.argv[2];

const fs = require('fs-promise');
const cheerio = require('cheerio');
const deepCopy = require('deep-copy');
const YAML = require('yamljs');
const co = require('co');

co(function * () {
  const data = JSON.parse(yield fs.readFile(JSONPath, 'utf8'));
  const YAMLData = {
    name: data.name,
    prefix: 'com.sonycsl.kadecot.echonetlite',
    rpc: {}
  };

  for (let method of data.methods) {
    const baseObj = {
      procedure: '',
      epc: parseInt(method.epc),
      size: method.size,
      announce: method.announce,
      doc: cheerio.load(method.doc.replace(/<\s*br\s*\/?\s*>/g, '\n')).root().text().trim(),
      params: {
        propertyName: {
          type: 'string',
          const: true,
          value: method.name
        }
      }
    };
    if (method.hasOwnProperty('get')) {
      const obj = deepCopy(baseObj);
      obj.procedure = 'get';
      YAMLData.rpc[ method.name + 'Get' ] = obj;
    }
    if (method.hasOwnProperty('set')) {
      const obj = deepCopy(baseObj);
      obj.procedure = 'set';
      obj.params.propertyValue = {
        type: 'array',
        const: false,
        value: new Array(parseInt(obj.size, 10) || 1).fill(0)
      };
      YAMLData.rpc[ method.name + 'Set' ] = obj;
    }
  }

  console.log(YAML.stringify(YAMLData, Number.MAX_SAFE_INTEGER, 2));
})
.catch((err) => console.error(err.stack || err));
