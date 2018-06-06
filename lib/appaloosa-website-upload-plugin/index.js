// inspired by https://github.com/webpack-contrib/s3-plugin-webpack
const AWS = require('aws-sdk');
const ProgressBar = require('progress');
const chalk = require('chalk');
const log = console.log;
const flatten = arr => arr.reduce((a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), []);

const inferContentType = function inferContentType(filename) {
  const ext = filename.split('.').pop();
  switch(ext) {
    case 'ico':
      return 'image/x-icon';
    case 'svg':
      return 'image/svg+xml';
    case 'html':
      return 'text/html';
    case 'js':
      return 'application/javascript'
    case 'css':
      return 'text/css';
    case 'png':
      return 'image/png';
    case 'jpeg':
    case 'jpg':
      return 'image/jpeg';
    case 'woff':
      return 'font/woff';
    case 'eot':
      return 'application/vnd.ms-fontobject';
    case 'ttf':
      return 'font/ttf';
    default:
      return 'application/octet-stream';
  }
}
function AppaloosaWebsiteUpload(options) {
  this.accessKeyId = options.s3.accessKeyId;
  this.secretAccessKey = options.s3.secretAccessKey;
  this.region = options.s3.region;
  this.bucket = options.s3.bucket;
  this.regExp = options.regExp || /.*/;
  let basePath = options.basePath || '';
  if (basePath !== '' && !/\/$/.test(basePath)) {
    basePath += '/';
  }
  this.basePath = basePath;
  this.client = new AWS.S3({
    accessKeyId: this.accessKeyId,
    secretAccessKey: this.secretAccessKey,
    region: this.region
  });
  this.fileMapping = {};
}

AppaloosaWebsiteUpload.prototype.apply = function(compiler) {
  const _this = this;

  compiler.plugin('compilation', function(compilation) {
    // use html-webpack-plugin events to update the html before file creation
    // This will replace all assets links (like `<img src='images/logo.png'>`) with their direct path on s3
    compilation.plugin('html-webpack-plugin-after-html-processing', (htmlPluginData, callback) => {
      Object.keys(_this.fileMapping).forEach(filename => {
        htmlPluginData.html = htmlPluginData.html.replace(new RegExp(filename, 'g'), _this.fileMapping[filename]);
      });
      callback(null, htmlPluginData);
    });
  });
  // Upload all assets files on s3 (assets target with this.regExp)
  compiler.plugin('emit', (compilation, cb) => {
    let files = Object.keys(compilation.assets).filter(file => _this.regExp.test(file));
    files = files.map(file => Object({
      filename: file,
      source:  compilation.assets[file]._value
    }));
    log(chalk.blue('\n#### Upload assets to s3 ####\n'));
    _this.uploadFiles(files, compilation.assets).then((filesUploaded) => {
      _this.generateFilesMapping(flatten(filesUploaded));
      log(chalk.blue('\n#### Assets uploaded to s3 with success ####\n'));
      return cb();
    }).catch(err => {
      log(chalk.red(`An error occured while uploading assets: ${err}`))
      return cb(err);
    });
  });
  // Upload all html files on s3.
  // Should be after assets upload and i18n plugin
  compiler.plugin('after-emit', function (compilation, cb) {
    let htmlFiles = Object.keys(compilation.assets).filter(file => /\.(js|html)$/.test(file));
    htmlFiles = htmlFiles.map(file => Object({
      filename: file,
      source: compilation.assets[file].source()
    }));
    log(chalk.blue('\n#### Upload HTML Files to s3 ####\n'));
    _this.uploadFiles(htmlFiles, compilation.assets).then(() => {
      log(chalk.blue('\n#### HTML files uploaded to s3 with success ####\n'));
      return cb();
    }).catch(err => {
      log(chalk.red(`An error occured while uploading HTML Files: ${err}`))
      return cb(err);
    });
  });
};
AppaloosaWebsiteUpload.prototype.uploadFiles = function(files, assets) {
  let uploaded = 0;
  const bar = new ProgressBar(`Uploading assets [:bar] :uploaded/:total`, {
    complete: '#',
    incomplete: '_',
    total: files.length
  });
  const uploadFiles = files.map((file) => {
    const upload = this.uploadFile(file.filename, file.source);
    upload.then((_) => {
      bar.tick({uploaded: ++uploaded});
      return _; // return filename
    });
    return upload;
  });
 
  return Promise.all(uploadFiles);
};
AppaloosaWebsiteUpload.prototype.uploadFile = function(filename, buffer) {
  const Key = `${this.basePath}${filename}`;
  // @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property callback
  const upload = this.client.putObject({
    ACL: 'public-read', 
    Body: buffer, 
    Bucket: this.bucket,
    Key,
    ContentType: inferContentType(Key)
  });

  return new Promise(function (resolve, reject) {
    upload.on('error', (err) => {
      return reject(err);
    })
    // use success event and not complete. Complete is trigger even if error
    upload.on('success', (/*response*/) => { // @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property callback
      return resolve(filename);
    });
    upload.send();
  });
}
AppaloosaWebsiteUpload.prototype.generateFilesMapping = function(files) {
  files.forEach(file => {
    this.fileMapping[file] = `https://s3-${this.region}.amazonaws.com/${this.bucket}/${this.basePath}${file}`;
  });
}
module.exports = AppaloosaWebsiteUpload;