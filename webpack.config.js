const path = require('path');
const fs = require('fs');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ManifestPlugin = require('webpack-manifest-plugin');
const I18nPlugin = require('./lib/i18n-plugin');
const AppaloosaWebsiteUpload = require('./lib/appaloosa-website-upload-plugin');
const ScriptExtHtmlWebpackPlugin = require('script-ext-html-webpack-plugin');
const webpack = require('webpack');

// Get all html files inside .tmp
// Return an array of relative path (string[])
const HTML_FILES = fs.readdirSync('./.tmp').filter(file => /\.html$/.test(file));
// Get all translations files
const I18N_FILES = fs.readdirSync('./translations').filter(file => /\.json$/.test(file));
// "import" all translations
const languages = I18N_FILES.reduce((acc, language) => {
  acc[language.replace(/\.json/, '')] = require(`./translations/${language}`);
  return acc;
}, {});

// Simple regex pattern used to extract a fileName without the file extension
const R_FILENAME = '[a-z0-9]+';
// Pattern used by `file-loader` to rename files
const ASSETS_NAME = '[name].[hash].[ext]';

let templates = [];
Object.keys(languages).forEach((language) =>
  HTML_FILES.forEach(file =>
    templates.push(new HtmlWebpackPlugin({
      filename: `${language}/${file}`,
      template: `./.tmp/${file}`
    }))
  ));

const translations = Object.keys(languages)
  .map(language => new I18nPlugin(languages[language], {
    lang: language,
    nested: true, // allow translation with nesting 'translation.nested' 
    functionName: 'i18n' // rename the translation function 'i18n()' instead of '__()' 
  }));
// create a webpack build per language
// will create a folder with the website per language

module.exports = function (env, args) {
  const plugins = [];
  const isProdBuild = env === 'prod';

  if (isProdBuild) {
    plugins.push(new AppaloosaWebsiteUpload({
      s3: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION,
        bucket: process.env.AWS_BUCKET
      },
      regExp: /\.(css|js|svg|png|jpg|eot|woff|ttf)$/,
      basePath: process.env.AWS_ASSETS_FOLDER
    }));
  } else {
    plugins.push(new ManifestPlugin());
  }
  // a dummy plugin that replace in the js code the keywork 'intercom_key' with his real value
  plugins.push(new webpack.DefinePlugin({
    "intercom_key":  JSON.stringify(process.env.intercom_key || 'kL7yCjkbZo1pRpPf0YEdoKn1OkEJ2mTC')
  }));
  plugins.push(...templates);
  plugins.push(...translations);
  plugins.push(new ScriptExtHtmlWebpackPlugin({
    defaultAttribute: 'async'
  }));

  return {
    entry: ['./.tmp/js/jquery.main.js', './.tmp/js/analytics.js'],
    plugins,
    output: {
      filename: '[name].bundle.js',
      path: path.resolve(__dirname, 'dist/'),
      publicPath: !isProdBuild? path.resolve(__dirname, 'dist/'): ''
    },
    module: {
      rules: [{
        test: /\.(eot|ttf|woff)$/,
        loader: 'file-loader',
        options: {
          regExp: new RegExp(`${R_FILENAME}\\.(eot|ttf|woff)$`),
          name: ASSETS_NAME,
          outputPath: 'fonts/',
          publicPath: (path) => { // if string publicPath is `${return}${path}`, if function publicPath is `${return}`
            return path;
          },
          useRelativePath: true,
          emitfile: !isProdBuild
        }
      }, {
        test: /\.css$/,
        use: [{
          loader: 'file-loader',
          options: {
            regExp: new RegExp(`${R_FILENAME}\\.css$`),
            name: ASSETS_NAME,
            outputPath: 'styles/',
            publicPath: isProdBuild? '': '../',
            emitfile: !isProdBuild
          }
        }, {
          loader: 'extract-loader'
        }, {
          loader: 'css-loader',
          options: {
            importLoaders: 1,
            minimize: true
          }
        }, {
          loader: 'postcss-loader',
          options: {
            plugins: (loader) => [
              require('autoprefixer')({
                browsers: ['last 4 versions']
              })
            ]
          }
        }]
      }, {
        test: /\.(png|jpg|svg)$/,
        loader: 'file-loader',
        options: {
          regExp: new RegExp(`${R_FILENAME}\\.(png|jpg|svg)$`),
          name: ASSETS_NAME,
          outputPath: 'images/',
          publicPath: isProdBuild? '': '../',
          emitfile: !isProdBuild
        }
      }, {
        test: /\.html$/,
        use: [{
          loader: 'html-loader',
          options: {
            attrs: ['img:src', 'link:href', 'source:srcset'],
            interpolate: true
          }
        }]
      }]
    }
  };
};