const defaultOpts = {
  prefix: '__jp',
  param: 'callback',
  timeout: 30 * 1000
};

const randomID = () => {
  return Math.random().toString(16).replace('.', '');
};

const enc = encodeURIComponent;

function jsonp (url, opts = {}) {
  return new Promise((resolve, reject) => {
    opts = Object.assign({ name: randomID() }, defaultOpts, opts);
    console.log(opts);

    const timer = setTimeout(() => {
      reject(new Error('Request timeout.'));
    }, opts.timeout);

    const success = (data) => {
      clearTimeout(timer);
      resolve(data);
    };

    const funcName = opts.prefix + opts.name;
    window[ funcName ] = success;

    const script = document.createElement('script');
    script.addEventListener('error', (err) => {
      clearTimeout(timer);
      console.log(err);
      reject(err);
    });
    const reqUrl =
      url + ( (!url.match(/\?/)) ? '?' : '&' ) + `${ opts.param }=${ enc(funcName) }`;
    script.setAttribute('src', reqUrl);
    document.head.appendChild(script);
  });
}

export default jsonp;
