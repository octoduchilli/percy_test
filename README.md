# Appaloosa's new 2018 website

## Prerequisites

You will need the following things properly installed on your computer, so get to it:

* [Git](http://git-scm.com/)
* [Node.js](http://nodejs.org/) (with NPM. Minimum version required is node v6)
* [Python](https://www.python.org/)

## How to build the website

Simply run `npm run build`, this will take care of everything:

* Compile template (shtml files)
* Generate css form sass files
* Upload the assets to aws S3 (images, font and js)
* Update assets links in html files (with s3 links)

**IMPORTANT**

Those env variables should be defined in order to upload the assets to s3.
`AWS_ACCESS_KEY_ID` your AWS access key.
`AWS_SECRET_ACCESS_KEY` your AWS secret key.
`AWS_REGION` the region of the target s3.
`AWS_BUCKET` the targeted bucket.

`AWS_ASSETS_FOLDER` _optional_ The destination folder in the bucket.

## Commands list

_All commands should be launch this way `npm run <command>`_

### `generate:template`

Compile all `shtml` files inside `sources` folders to generate `html` files.
The generated `html` files will be "moved" in the `.tmp` folder.

### `generate:css`

Generate the website's `css` files by compiling all SASS files.
Currently compile `main.scss` and `bootstrap.scss` and "move" the generated `css` files in `.tmp`.

### `move:assets`

Copy the assets files inside `sources` into `.tmp`.
_Mandatory for the complete build, otherwise webpack will fail to resolve assets_

### `build:website`

Execute the webpack build. See `[How to build the website](#how-to-build-the-website)`

### `clean`

A simple clean task which delete the `.tmp` folder.

### `build`

Build the website, will execute all commands in this order.

1 - `clean`
2 - `generate:template`
3 - `generate:css`
4 - `build:website`

## Development

### Translations

Website translations can be found in the `translations` folder.
A translation file should be a valid json file and a translation should be defined like this:

```json
  "key": "translation"
```

Translations can be nested :

```json
  "nested": {
    "key': "translation"
  }
```

To add a translation inside the generated html files you have to wrote some like this in the shtml files.

```html
  <div>$(i18n('translation_key'))</div>
```

_`translation_key` should be the key of a json string defined in a translation file (json file inside the `translation` folder)._

If you want to translate the website in a new language, you only need to add a new json file in the `translations` folder.
Translation files should be named like this `[contry_code].json`, `country_code` should follow the [ISO 639-1](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes).

If you want to add the country code, of the translation file, somewhere in the page (inside a link, an hmlt attribut...) you hace use `$(lang)` and it will be replaced.

For example this code inside an shtml file.

```html
  <a href='/$(lang)/page'>Page</a>
```

Will give this code in final html file (for the french translation).

```html
  <a href='/fr/page'>Page</a>
```