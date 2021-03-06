"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var loadData = function () {
  var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(rulePath, baseDir) {
    var isNode, data, fs, _path, expandedRulePath;

    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            isNode = process.title !== "browser";
            data = void 0;

            if (!isNode) {
              _context.next = 9;
              break;
            }

            fs = require("fs");
            _path = require("path");
            expandedRulePath = untildify(rulePath);

            data = fs.readFileSync(_path.resolve(baseDir, expandedRulePath), "utf8");
            _context.next = 14;
            break;

          case 9:
            _context.next = 11;
            return fetch(rulePath);

          case 11:
            _context.next = 13;
            return _context.sent.text();

          case 13:
            data = _context.sent;

          case 14:
            return _context.abrupt("return", data);

          case 15:
          case "end":
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function loadData(_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();

var loadDictionaries = function () {
  var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(rulePath, baseDir) {
    var dictionaries, data;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            if (!(typeof rulePath === "undefined" || rulePath === "")) {
              _context2.next = 2;
              break;
            }

            return _context2.abrupt("return", null);

          case 2:
            dictionaries = [];
            _context2.t0 = yaml;
            _context2.next = 6;
            return loadData(rulePath, baseDir);

          case 6:
            _context2.t1 = _context2.sent;
            data = _context2.t0.safeLoad.call(_context2.t0, _context2.t1);


            data.dict.forEach(function (item) {
              var form = "";
              item.tokens.forEach(function (token) {
                form += token.surface_form;
              });
              dictionaries.push({
                message: data.message + ': "' + form + '" => "' + item.expected + '"',
                fix: item.expected,
                tokens: item.tokens
              });
            });

            return _context2.abrupt("return", dictionaries);

          case 10:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function loadDictionaries(_x3, _x4) {
    return _ref2.apply(this, arguments);
  };
}();

var _textlintRuleHelper = require("textlint-rule-helper");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var kuromojin = require("kuromojin");
var createMatcher = require("morpheme-match-all");
var yaml = require("js-yaml");

var untildify = require("untildify");

var defaultOptions = {
  rulePath: __dirname + "/../dict/fukushi.yml"
};

var matchAllCache = null;

function reporter(context) {
  var userOptions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var Syntax = context.Syntax,
      RuleError = context.RuleError,
      getSource = context.getSource,
      fixer = context.fixer;

  return (0, _textlintRuleHelper.wrapReportHandler)(context, {}, function (report) {
    return _defineProperty({}, Syntax.Str, function () {
      var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(node) {
        var options, matchAll, text;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                // "Str" node
                options = Object.assign(defaultOptions, userOptions);
                _context3.t0 = matchAllCache;

                if (_context3.t0) {
                  _context3.next = 8;
                  break;
                }

                _context3.t1 = createMatcher;
                _context3.next = 6;
                return loadDictionaries(options.rulePath, getConfigBaseDir(context));

              case 6:
                _context3.t2 = _context3.sent;
                _context3.t0 = (0, _context3.t1)(_context3.t2);

              case 8:
                matchAll = _context3.t0;

                matchAllCache = matchAll;
                text = getSource(node); // Get text

                return _context3.abrupt("return", kuromojin.tokenize(text).then(function (actualTokens) {
                  var results = matchAll(actualTokens);
                  console.log(results);

                  if (results.length == 0) {
                    return;
                  }

                  results.forEach(function (result) {
                    var tokenIndex = result.index;
                    var index = getIndexFromTokens(tokenIndex, actualTokens);
                    var replaceFrom = "";
                    result.tokens.forEach(function (token) {
                      replaceFrom += token.surface_form;
                    });
                    var replaceTo = fixer.replaceTextRange([index, index + replaceFrom.length], result.dict.fix);
                    var ruleError = new RuleError(result.dict.message, {
                      index: index,
                      fix: replaceTo // https://github.com/textlint/textlint/blob/master/docs/rule-fixable.md
                    });
                    report(node, ruleError);
                  });
                }));

              case 12:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      return function (_x6) {
        return _ref3.apply(this, arguments);
      };
    }());
  });
}

function getIndexFromTokens(tokenIndex, actualTokens) {
  var index = 0;
  for (var i = 0; i < tokenIndex; i++) {
    index += actualTokens[i].surface_form.length;
  }
  return index;
}

// from https://github.com/textlint-rule/textlint-rule-prh/blob/master/src/textlint-rule-prh.js#L147
var getConfigBaseDir = function getConfigBaseDir(context) {
  if (typeof context.getConfigBaseDir === "function") {
    return context.getConfigBaseDir() || process.cwd();
  }
  var textlintRcFilePath = context.config ? context.config.configFile : null;
  return textlintRcFilePath ? path.dirname(textlintRcFilePath) : process.cwd();
};

exports.default = reporter;
//# sourceMappingURL=index.js.map