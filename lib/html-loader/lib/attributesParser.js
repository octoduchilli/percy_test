/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Parser = require("fastparse");

var processMatch = function(match, strUntilValue, name, value, index) {
  if(!this.isRelevantTagAttr(this.currentTag, name)) return;
  if (this.currentTag == 'source') {
    let previous = "";
    const values = value.split(',');
    values.forEach((element, i) => {
      this.results.push({
        start: index + strUntilValue.length + previous.length,
        length: element.replace(/\s\d+x/, '').trim().length, // add the size of ,
        value: element.replace(/\s\d+x/, '').trim()
      });
      previous = element + ( i === values.length? 0 : 1) + 1;
    });
  } else {
    this.results.push({
      start: index + strUntilValue.length,
      length: value.length,
      value: value
    });
  }
};

var parser = new Parser({
	outside: {
		"<!--.*?-->": true,
		"<![CDATA[.*?]]>": true,
		"<[!\\?].*?>": true,
		"<\/[^>]+>": true,
		"<([a-zA-Z\\-:]+)\\s*": function(match, tagName) {
			this.currentTag = tagName;
			return "inside";
		}
	},
	inside: {
		"\\s+": true, // eat up whitespace
		">": "outside", // end of attributes
		"(([0-9a-zA-Z\\-:]+)\\s*=\\s*\")([^\"]*)\"": processMatch,
		"(([0-9a-zA-Z\\-:]+)\\s*=\\s*\')([^\']*)\'": processMatch,
		"(([0-9a-zA-Z\\-:]+)\\s*=\\s*)([^\\s>]+)": processMatch
	}
});

module.exports = function parse(html, isRelevantTagAttr) {
	return parser.parse("outside", html, {
		currentTag: null,
		results: [],
		isRelevantTagAttr: isRelevantTagAttr
	}).results;
};
