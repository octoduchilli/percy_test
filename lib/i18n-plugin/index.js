const chalk = require('chalk');
const log = console.log;
// inspired by https://github.com/webpack-contrib/i18n-webpack-plugin

/**
 * Return all keys of an object
 * @example:
 *  ```javascript 
 *  const anObject = {
 *    a: {
 *      b: {
 *        c: 1,
 *        d: 2
 *      },
 *      e: 3
 *    }
 *  }
 *  objectKeysToSting(anObject); // ['a.b.c', 'a.b.d', 'a.e']
 * @param {Object} obj 
 */
function objectKeysToSting(obj) {
  const strs = [];
  function deep(o, str) {
    Object.keys(o).forEach(key => {
      if (typeof o[key] === "object") {
        deep(o[key], `${str}.${key}`);
      } else {
        strs.push(`${str}.${key}`);
      }
    })
  }
  Object.keys(obj).forEach(key => {
    if (typeof obj[key] === "object") {
      deep(obj[key], key);
    } else {
      strs.push(key);
    }
  })
  return strs;
}

/**
 *
 * @param {object}  localization
 * @returns {Function}
 */
function makeLocalizeFunction(localization, nested) {
  return function localizeFunction(key) {
    return nested ? byString(localization, key) : localization[key];
  };
}

/**
 *
 * @param {object}  localization
 * @param {string}  string key
 * @returns {*}
 */
function byString(object, string) {
  // strip a leading dot
  var stringKey = string.replace(/^\./, '');

  var keysArray = stringKey.split('.');
  for (var i = 0, length = keysArray.length; i < length; ++i) {
    var key = keysArray[i];

    if (!(key in object)) return;

    object = object[key];
  }

  return object;
}

function I18nPlugin(localization, options, failOnMissing) {
  // Backward-compatiblility
  if (typeof options === 'string') {
    options = {
      functionName: options
    };
  }

  if (typeof failOnMissing !== 'undefined') {
    options.failOnMissing = failOnMissing;
  }

  this.options = options || {};
  this.lang = options.lang;
  this.localization = localization ? typeof localization === 'function' ? localization : makeLocalizeFunction(localization, !!this.options.nested) : null;
  this.unUsedLocalization = objectKeysToSting(localization);
  this.functionName = this.options.functionName || '__';
  this.failOnMissing = !!this.options.failOnMissing;
  this.hideMessage = this.options.hideMessage || false;
}

I18nPlugin.prototype.apply = function(compiler) {
  const _this = this;
  
  compiler.plugin('compilation', function (compilation, data) {
    compilation.plugin('html-webpack-plugin-after-html-processing', (htmlPluginData, callback) => {
      const lang = htmlPluginData.outputName.split('/')[0];
      let offset = 0;
      if (lang !== _this.lang) {
        return callback(null, htmlPluginData);
      }
      let content = [htmlPluginData.html];
      let match = null;
      const R_lang = new RegExp("\\$\\(lang\\)", "g");
      while ((match = R_lang.exec(htmlPluginData.html)) !== null) {
        const extract = match[0];
        content.pop();
        content.push(htmlPluginData.html.substring(offset, match.index));
        content.push(_this.lang);
        offset = match.index + extract.length;
        content.push(htmlPluginData.html.substring(match.index + extract.length));
      }
      htmlPluginData.html = content.join('');
      content = [htmlPluginData.html];
      offset = 0;

      const R = new RegExp(`\\$\\(${_this.functionName}\\('(\\w+(?:\\.\\w+)*)'\\)\\)`, 'g');
      while ((match = R.exec(htmlPluginData.html)) !== null) {
        const extract = match[0];
        const key = match[1];
        content.pop();
        content.push(htmlPluginData.html.substring(offset, match.index));
        const translation = _this.localization(key);
        _this.unUsedLocalization = _this.unUsedLocalization.filter(_ => _ !== key);
        if (translation === undefined) {
          return callback(`Missing "${lang}" translation for key "${key}" in file "${htmlPluginData.outputName.split('/').pop()}".`);
        }
        content.push(translation);
        offset = match.index + extract.length;
        content.push(htmlPluginData.html.substring(match.index + extract.length));
      }
      htmlPluginData.html = content.join('');
      return callback(null, htmlPluginData);
    });
  });
  compiler.plugin('done', function() {
    if (_this.unUsedLocalization.length > 0) {
      log(chalk.yellow(`⚠️ You've some unused translations ("${_this.lang}"): \n`));
      _this.unUsedLocalization.forEach(key => {
        log(chalk.blue(`\t${key}`));
      });
      log();
    }
  });
};
module.exports = I18nPlugin;