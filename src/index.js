"use strict";

import { wrapReportHandler } from "textlint-rule-helper";

const kuromojin = require("kuromojin");
const createMatcher = require("morpheme-match-all");
const yaml = require("js-yaml");

const untildify = require("untildify");

const defaultOptions = {
  rulePath: __dirname + "/../dict/fukushi.yml",
};

let cache = null;

async function loadData(rulePath, baseDir) {
  const isNode = process.title !== "browser";

  let data;
  if (isNode) {
    const fs = require("fs");
    const path = require("path");
    const expandedRulePath = untildify(rulePath);
    data = fs.readFileSync(path.resolve(baseDir, expandedRulePath), "utf8");
  } else {
    data = cache || (await (await fetch(rulePath)).text());
    cache = data;
  }

  return data;
}

async function loadDictionaries(rulePath, baseDir) {
  if (typeof rulePath === "undefined" || rulePath === "") {
    return null;
  }
  const dictionaries = [];

  const data = yaml.safeLoad(await loadData(rulePath, baseDir));

  data.dict.forEach(function (item) {
    var form = "";
    item.tokens.forEach(function (token) {
      form += token.surface_form;
    });
    dictionaries.push({
      message: data.message + ': "' + form + '" => "' + item.expected + '"',
      fix: item.expected,
      tokens: item.tokens,
    });
  });

  return dictionaries;
}

function reporter(context, userOptions = {}) {
  const { Syntax, RuleError, getSource, fixer } = context;
  return wrapReportHandler(context, {}, (report) => {
    return {
      async [Syntax.Str](node) {
        // "Str" node
        const options = Object.assign(defaultOptions, userOptions);
        const matchAll = createMatcher(
          await loadDictionaries(options.rulePath, getConfigBaseDir(context))
        );
        const text = getSource(node); // Get text
        return kuromojin.tokenize(text).then((actualTokens) => {
          const results = matchAll(actualTokens);
          console.log(results);

          if (results.length == 0) {
            return;
          }

          results.forEach(function (result) {
            const tokenIndex = result.index;
            const index = getIndexFromTokens(tokenIndex, actualTokens);
            let replaceFrom = "";
            result.tokens.forEach(function (token) {
              replaceFrom += token.surface_form;
            });
            const replaceTo = fixer.replaceTextRange(
              [index, index + replaceFrom.length],
              result.dict.fix
            );
            const ruleError = new RuleError(result.dict.message, {
              index: index,
              fix: replaceTo, // https://github.com/textlint/textlint/blob/master/docs/rule-fixable.md
            });
            report(node, ruleError);
          });
        });
      },
    };
  });
}

function getIndexFromTokens(tokenIndex, actualTokens) {
  let index = 0;
  for (let i = 0; i < tokenIndex; i++) {
    index += actualTokens[i].surface_form.length;
  }
  return index;
}

// from https://github.com/textlint-rule/textlint-rule-prh/blob/master/src/textlint-rule-prh.js#L147
const getConfigBaseDir = (context) => {
  if (typeof context.getConfigBaseDir === "function") {
    return context.getConfigBaseDir() || process.cwd();
  }
  const textlintRcFilePath = context.config ? context.config.configFile : null;
  return textlintRcFilePath ? path.dirname(textlintRcFilePath) : process.cwd();
};

export default reporter;
