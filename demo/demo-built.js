!function(e){function r(e,r,o){return 4===arguments.length?t.apply(this,arguments):void n(e,{declarative:!0,deps:r,declare:o})}function t(e,r,t,o){n(e,{declarative:!1,deps:r,executingRequire:t,execute:o})}function n(e,r){r.name=e,e in p||(p[e]=r),r.normalizedDeps=r.deps}function o(e,r){if(r[e.groupIndex]=r[e.groupIndex]||[],-1==v.call(r[e.groupIndex],e)){r[e.groupIndex].push(e);for(var t=0,n=e.normalizedDeps.length;n>t;t++){var a=e.normalizedDeps[t],u=p[a];if(u&&!u.evaluated){var d=e.groupIndex+(u.declarative!=e.declarative);if(void 0===u.groupIndex||u.groupIndex<d){if(void 0!==u.groupIndex&&(r[u.groupIndex].splice(v.call(r[u.groupIndex],u),1),0==r[u.groupIndex].length))throw new TypeError("Mixed dependency cycle detected");u.groupIndex=d}o(u,r)}}}}function a(e){var r=p[e];r.groupIndex=0;var t=[];o(r,t);for(var n=!!r.declarative==t.length%2,a=t.length-1;a>=0;a--){for(var u=t[a],i=0;i<u.length;i++){var s=u[i];n?d(s):l(s)}n=!n}}function u(e){return x[e]||(x[e]={name:e,dependencies:[],exports:{},importers:[]})}function d(r){if(!r.module){var t=r.module=u(r.name),n=r.module.exports,o=r.declare.call(e,function(e,r){if(t.locked=!0,"object"==typeof e)for(var o in e)n[o]=e[o];else n[e]=r;for(var a=0,u=t.importers.length;u>a;a++){var d=t.importers[a];if(!d.locked)for(var i=0;i<d.dependencies.length;++i)d.dependencies[i]===t&&d.setters[i](n)}return t.locked=!1,r},r.name);t.setters=o.setters,t.execute=o.execute;for(var a=0,i=r.normalizedDeps.length;i>a;a++){var l,s=r.normalizedDeps[a],c=p[s],v=x[s];v?l=v.exports:c&&!c.declarative?l=c.esModule:c?(d(c),v=c.module,l=v.exports):l=f(s),v&&v.importers?(v.importers.push(t),t.dependencies.push(v)):t.dependencies.push(null),t.setters[a]&&t.setters[a](l)}}}function i(e){var r,t=p[e];if(t)t.declarative?c(e,[]):t.evaluated||l(t),r=t.module.exports;else if(r=f(e),!r)throw new Error("Unable to load dependency "+e+".");return(!t||t.declarative)&&r&&r.__useDefault?r["default"]:r}function l(r){if(!r.module){var t={},n=r.module={exports:t,id:r.name};if(!r.executingRequire)for(var o=0,a=r.normalizedDeps.length;a>o;o++){var u=r.normalizedDeps[o],d=p[u];d&&l(d)}r.evaluated=!0;var c=r.execute.call(e,function(e){for(var t=0,n=r.deps.length;n>t;t++)if(r.deps[t]==e)return i(r.normalizedDeps[t]);throw new TypeError("Module "+e+" not declared as a dependency.")},t,n);c&&(n.exports=c),t=n.exports,t&&t.__esModule?r.esModule=t:r.esModule=s(t)}}function s(r){if(r===e)return r;var t={};if("object"==typeof r||"function"==typeof r)if(g){var n;for(var o in r)(n=Object.getOwnPropertyDescriptor(r,o))&&h(t,o,n)}else{var a=r&&r.hasOwnProperty;for(var o in r)(!a||r.hasOwnProperty(o))&&(t[o]=r[o])}return t["default"]=r,h(t,"__useDefault",{value:!0}),t}function c(r,t){var n=p[r];if(n&&!n.evaluated&&n.declarative){t.push(r);for(var o=0,a=n.normalizedDeps.length;a>o;o++){var u=n.normalizedDeps[o];-1==v.call(t,u)&&(p[u]?c(u,t):f(u))}n.evaluated||(n.evaluated=!0,n.module.execute.call(e))}}function f(e){if(D[e])return D[e];if("@node/"==e.substr(0,6))return y(e.substr(6));var r=p[e];if(!r)throw"Module "+e+" not present.";return a(e),c(e,[]),p[e]=void 0,r.declarative&&h(r.module.exports,"__esModule",{value:!0}),D[e]=r.declarative?r.module.exports:r.esModule}var p={},v=Array.prototype.indexOf||function(e){for(var r=0,t=this.length;t>r;r++)if(this[r]===e)return r;return-1},g=!0;try{Object.getOwnPropertyDescriptor({a:0},"a")}catch(m){g=!1}var h;!function(){try{Object.defineProperty({},"a",{})&&(h=Object.defineProperty)}catch(e){h=function(e,r,t){try{e[r]=t.value||t.get.call(e)}catch(n){}}}}();var x={},y="undefined"!=typeof System&&System._nodeRequire||"undefined"!=typeof require&&require.resolve&&"undefined"!=typeof process&&require,D={"@empty":{}};return function(e,n,o){return function(a){a(function(a){for(var u={_nodeRequire:y,register:r,registerDynamic:t,get:f,set:function(e,r){D[e]=r},newModule:function(e){return e}},d=0;d<n.length;d++)(function(e,r){r&&r.__esModule?D[e]=r:D[e]=s(r)})(n[d],arguments[d]);o(u);var i=f(e[0]);if(e.length>1)for(var d=1;d<e.length;d++)f(e[d]);return i.__useDefault?i["default"]:i})}}}("undefined"!=typeof self?self:global)

(["1"], [], function($__System) {

$__System.register("2", [], function (_export) {
    "use strict";

    _export("VoyaColumnTemplate", VoyaColumnTemplate);

    function VoyaColumnTemplate() {
        function render(data) {
            return "<div class=\"voya-col " + data.name + "\"><div class=\"label\">" + data.name + "</div> <div class=\"voya-col-actions\"></div></div>";
        }
        function addButton(el, button) {
            el.querySelector(".voya-col-actions").appendChild(button);
        }
        function updateTheme(el) {
            if (el.theme) el.classList.add(el.theme);
            if (el.borders) el.classList.add(el.borders);
        }
        function updateColumnWidth(el) {
            el.style.width = el.width;
        }
        return {
            render: render,
            addButton: addButton,
            updateTheme: updateTheme,
            updateColumnWidth: updateColumnWidth
        };
    }

    return {
        setters: [],
        execute: function () {}
    };
});
$__System.register("3", ["4", "5", "6", "7"], function (_export) {
    var _defineDecoratedPropertyDescriptor, _createDecoratedClass, _classCallCheck, property, nullable, SORT_TYPE, Sort;

    return {
        setters: [function (_) {
            _defineDecoratedPropertyDescriptor = _["default"];
        }, function (_2) {
            _createDecoratedClass = _2["default"];
        }, function (_3) {
            _classCallCheck = _3["default"];
        }, function (_4) {
            property = _4.property;
            nullable = _4.nullable;
        }],
        execute: function () {
            "use strict";

            SORT_TYPE = ["ASC", "DESC", null];

            Sort = (function () {
                var _instanceInitializers = {};

                function Sort(column) {
                    _classCallCheck(this, Sort);

                    _defineDecoratedPropertyDescriptor(this, "event", _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, "col", _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, "button", _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, "sortType", _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, "clickCount", _instanceInitializers);

                    this.col = column;
                    this.event = new CustomEvent("columnSort", { bubbles: true });
                    this.button = document.createElement('div');
                    this.button.className = "voya-col-sort " + this.col.name || "voya-col-sort";
                    this.col.classList.add("cursor");
                    this.eventListeners();
                }

                _createDecoratedClass(Sort, [{
                    key: "eventListeners",
                    value: function eventListeners() {
                        this.col.addEventListener('click', this.executeSort.bind(this), true);
                    }
                }, {
                    key: "executeSort",
                    value: function executeSort() {
                        this.removeButtonSort();
                        this.clickCount = this.clickCount >= 0 ? parseInt(this.clickCount) + 1 : 0;
                        this.clickCount = this.clickCount > SORT_TYPE.length - 1 ? 0 : this.clickCount;
                        this.sortType = SORT_TYPE[this.clickCount];
                        this.addButtonSort();
                        this.event.sortType = this.sortType;
                        this.event.columnName = this.col.name;
                        this.event.colIndex = this.col.index;
                        this.button.dispatchEvent(this.event);
                    }
                }, {
                    key: "removeActiveSort",
                    value: function removeActiveSort(e) {
                        if (this.col.name === e.columnName) return;
                        this.button.classList.remove(this.sortType);
                        this.clickCount = undefined;
                    }
                }, {
                    key: "removeButtonSort",
                    value: function removeButtonSort() {
                        if (!this.sortType) return;
                        this.button.classList.remove(this.sortType);
                    }
                }, {
                    key: "addButtonSort",
                    value: function addButtonSort() {
                        if (!this.sortType) return;
                        this.button.classList.add(this.sortType);
                    }
                }, {
                    key: "event",
                    decorators: [property],
                    initializer: function initializer() {
                        return new CustomEvent("columnSort");
                    },
                    enumerable: true
                }, {
                    key: "col",
                    decorators: [property],
                    initializer: null,
                    enumerable: true
                }, {
                    key: "button",
                    decorators: [property],
                    initializer: null,
                    enumerable: true
                }, {
                    key: "sortType",
                    decorators: [property],
                    initializer: null,
                    enumerable: true
                }, {
                    key: "clickCount",
                    decorators: [property({ type: 'integer' })],
                    initializer: null,
                    enumerable: true
                }], null, _instanceInitializers);

                return Sort;
            })();

            _export("Sort", Sort);
        }
    };
});
$__System.register('8', ['4', '5', '6', '7'], function (_export) {
    var _defineDecoratedPropertyDescriptor, _createDecoratedClass, _classCallCheck, property, nullable, Filter;

    return {
        setters: [function (_) {
            _defineDecoratedPropertyDescriptor = _['default'];
        }, function (_2) {
            _createDecoratedClass = _2['default'];
        }, function (_3) {
            _classCallCheck = _3['default'];
        }, function (_4) {
            property = _4.property;
            nullable = _4.nullable;
        }],
        execute: function () {
            'use strict';

            Filter = (function () {
                var _instanceInitializers = {};

                function Filter(column) {
                    _classCallCheck(this, Filter);

                    _defineDecoratedPropertyDescriptor(this, 'col', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'button', _instanceInitializers);

                    this.col = column;
                    this.button = document.createElement('div');
                    this.button.innerHTML = "+";
                    this.button.className = "voya-col-filter " + this.col.dataItem || "voya-col-filter";
                    this.eventListeners();
                }

                _createDecoratedClass(Filter, [{
                    key: 'eventListeners',
                    value: function eventListeners() {
                        this.button.addEventListener('click', this.executeFilter.bind(this), true);
                    }
                }, {
                    key: 'executeFilter',
                    value: function executeFilter(e) {
                        console.log(this.col.name);
                    }
                }, {
                    key: 'col',
                    decorators: [property],
                    initializer: null,
                    enumerable: true
                }, {
                    key: 'button',
                    decorators: [property],
                    initializer: null,
                    enumerable: true
                }], null, _instanceInitializers);

                return Filter;
            })();

            _export('Filter', Filter);
        }
    };
});
$__System.register('9', ['2', '3', '4', '5', '6', '7', '8', 'a', 'b', 'c', 'd'], function (_export) {
    var VoyaColumnTemplate, Sort, _defineDecoratedPropertyDescriptor, _createDecoratedClass, _classCallCheck, property, nullable, Filter, _get, _inherits, _WeakMap, _Object$keys, _features, _privateProperties, VoyaColumn;

    return {
        setters: [function (_4) {
            VoyaColumnTemplate = _4.VoyaColumnTemplate;
        }, function (_6) {
            Sort = _6.Sort;
        }, function (_) {
            _defineDecoratedPropertyDescriptor = _['default'];
        }, function (_2) {
            _createDecoratedClass = _2['default'];
        }, function (_3) {
            _classCallCheck = _3['default'];
        }, function (_5) {
            property = _5.property;
            nullable = _5.nullable;
        }, function (_7) {
            Filter = _7.Filter;
        }, function (_a) {
            _get = _a['default'];
        }, function (_b) {
            _inherits = _b['default'];
        }, function (_c) {
            _WeakMap = _c['default'];
        }, function (_d) {
            _Object$keys = _d['default'];
        }],
        execute: function () {
            'use strict';

            _features = undefined;
            _privateProperties = new _WeakMap();

            VoyaColumn = (function (_ref) {
                var _instanceInitializers = {};

                _inherits(VoyaColumn, _ref);

                function VoyaColumn() {
                    _classCallCheck(this, VoyaColumn);

                    _get(Object.getPrototypeOf(VoyaColumn.prototype), 'constructor', this).apply(this, arguments);

                    _defineDecoratedPropertyDescriptor(this, 'index', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'data', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'width', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'borders', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'theme', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'name', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'template', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'cellTemplate', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'mobile', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'mobileLabel', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'sort', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'filter', _instanceInitializers);
                }

                _createDecoratedClass(VoyaColumn, [{
                    key: 'createdCallback',
                    value: function createdCallback() {
                        _features = { sort: null, filter: null };
                        this.template = VoyaColumnTemplate();
                        this.name = !this.name ? this.innerHTML : this.name;
                        _privateProperties.set(this, _features);
                        this.render();
                        this.assembleFeatures();
                    }
                }, {
                    key: 'render',
                    value: function render() {
                        this.innerHTML = this.template.render(this);
                        if (!this.theme && !this.borders) return;
                        this.template.updateTheme(this);
                    }
                }, {
                    key: 'propertyChangedCallback',
                    value: function propertyChangedCallback(prop, oldValue, newValue) {
                        if (oldValue !== newValue) {
                            if (prop == 'sort' || prop == 'filter') {
                                this.assembleFeatures();
                            }
                            if (prop == "theme" || prop == "borders") {
                                this.template.updateTheme(this);
                            }
                            if (prop == "width") {
                                this.template.updateColumnWidth(this);
                            }
                        }
                    }
                }, {
                    key: 'assembleFeatures',
                    value: function assembleFeatures() {
                        _Object$keys(_features).forEach((function (prop) {
                            this.buildFeature(prop);
                        }).bind(this));
                    }
                }, {
                    key: 'buildFeature',
                    value: function buildFeature(prop) {
                        if (!this[prop]) return;
                        _privateProperties.get(this)[prop] = prop === "sort" ? new Sort(this) : new Filter(this);
                        this.template.addButton(this, _privateProperties.get(this)[prop].button);
                    }
                }, {
                    key: 'removePreviousSorts',
                    value: function removePreviousSorts(e) {
                        if (!_privateProperties.get(this).sort) return;
                        _privateProperties.get(this).sort.removeActiveSort(e);
                    }
                }, {
                    key: 'index',
                    decorators: [property],
                    initializer: null,
                    enumerable: true
                }, {
                    key: 'data',
                    decorators: [property],
                    initializer: null,
                    enumerable: true
                }, {
                    key: 'width',
                    decorators: [property],
                    initializer: null,
                    enumerable: true
                }, {
                    key: 'borders',
                    decorators: [property],
                    initializer: null,
                    enumerable: true
                }, {
                    key: 'theme',
                    decorators: [property],
                    initializer: null,
                    enumerable: true
                }, {
                    key: 'name',
                    decorators: [nullable, property],
                    initializer: null,
                    enumerable: true
                }, {
                    key: 'template',
                    decorators: [nullable, property],
                    initializer: null,
                    enumerable: true
                }, {
                    key: 'cellTemplate',
                    decorators: [nullable, property],
                    initializer: null,
                    enumerable: true
                }, {
                    key: 'mobile',
                    decorators: [property({ type: 'boolean' })],
                    initializer: null,
                    enumerable: true
                }, {
                    key: 'mobileLabel',
                    decorators: [property({ type: 'boolean' })],
                    initializer: null,
                    enumerable: true
                }, {
                    key: 'sort',
                    decorators: [property({ type: 'boolean' })],
                    initializer: null,
                    enumerable: true
                }, {
                    key: 'filter',
                    decorators: [property({ type: 'boolean' })],
                    initializer: null,
                    enumerable: true
                }], null, _instanceInitializers);

                return VoyaColumn;
            })(HTMLElement || Element);

            _export('VoyaColumn', VoyaColumn);

            document.registerElement('voya-column', VoyaColumn);
        }
    };
});
$__System.register("e", [], function (_export) {
    "use strict";

    _export("VoyaRowTemplate", VoyaRowTemplate);

    function VoyaRowTemplate() {
        function render(data) {
            return "<div class=\"voya-row\"></div>";
        }
        function addCells(el) {
            el.querySelector(".voya-row").innerHTML = "";
            el.cells.forEach(function (cell) {
                el.querySelector(".voya-row").appendChild(cell);
            });
        }
        function updateRowTheme(el) {
            if (el.alternate) {
                el.classList.add(el.alternate);
            }
            if (el.borders) {
                el.classList.add(el.borders);
            }
            if (el.theme) {
                el.classList.add(el.theme);
            }
        }
        return {
            render: render,
            addCells: addCells,
            updateRowTheme: updateRowTheme
        };
    }

    return {
        setters: [],
        execute: function () {}
    };
});
$__System.register('f', ['4', '5', '6', '7', 'a', 'b', 'e'], function (_export) {
    var _defineDecoratedPropertyDescriptor, _createDecoratedClass, _classCallCheck, property, nullable, _get, _inherits, VoyaRowTemplate, VoyaRow;

    return {
        setters: [function (_) {
            _defineDecoratedPropertyDescriptor = _['default'];
        }, function (_2) {
            _createDecoratedClass = _2['default'];
        }, function (_3) {
            _classCallCheck = _3['default'];
        }, function (_4) {
            property = _4.property;
            nullable = _4.nullable;
        }, function (_a) {
            _get = _a['default'];
        }, function (_b) {
            _inherits = _b['default'];
        }, function (_e) {
            VoyaRowTemplate = _e.VoyaRowTemplate;
        }],
        execute: function () {
            'use strict';

            VoyaRow = (function (_ref) {
                var _instanceInitializers = {};

                _inherits(VoyaRow, _ref);

                function VoyaRow() {
                    _classCallCheck(this, VoyaRow);

                    _get(Object.getPrototypeOf(VoyaRow.prototype), 'constructor', this).apply(this, arguments);

                    _defineDecoratedPropertyDescriptor(this, 'template', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'borders', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'alternate', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'rowData', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'columns', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'cells', _instanceInitializers);
                }

                _createDecoratedClass(VoyaRow, [{
                    key: 'createdCallback',
                    value: function createdCallback() {
                        this.template = VoyaRowTemplate();
                        this.cells = [];
                        this.render();
                        this.alternate;
                    }
                }, {
                    key: 'render',
                    value: function render() {
                        this.innerHTML = this.template.render(this);
                    }
                }, {
                    key: 'propertyChangedCallback',
                    value: function propertyChangedCallback(prop, oldValue, newValue) {
                        if (prop === "alternate" || prop === "borders" || prop == "theme") {
                            this.template.updateRowTheme(this);
                        }
                        if (prop === "rowData") {
                            this.buildCells();
                        }
                    }
                }, {
                    key: 'buildCells',
                    value: function buildCells() {
                        this.cells = this.columns.map((function (col) {
                            var cell = document.createElement("voya-cell");
                            cell.cellName = col.name;
                            cell.mobile = col.mobile;
                            cell.label = col.mobileLabel ? col.name : null;
                            cell.cellValue = this.rowData[cell.cellName];
                            cell.cellTemplate = col.cellTemplate ? col.cellTemplate : null;
                            if (cell.cellTemplate) cell.renderCellTemplate();
                            cell.width = col.width;
                            return cell;
                        }).bind(this));
                        this.template.addCells(this);
                    }
                }, {
                    key: 'template',
                    decorators: [nullable, property],
                    initializer: null,
                    enumerable: true
                }, {
                    key: 'borders',
                    decorators: [nullable, property],
                    initializer: null,
                    enumerable: true
                }, {
                    key: 'alternate',
                    decorators: [nullable, property],
                    initializer: null,
                    enumerable: true
                }, {
                    key: 'rowData',
                    decorators: [nullable, property],
                    initializer: null,
                    enumerable: true
                }, {
                    key: 'columns',
                    decorators: [nullable, property],
                    initializer: null,
                    enumerable: true
                }, {
                    key: 'cells',
                    decorators: [nullable, property],
                    initializer: null,
                    enumerable: true
                }], null, _instanceInitializers);

                return VoyaRow;
            })(HTMLElement || Element);

            _export('VoyaRow', VoyaRow);

            document.registerElement('voya-row', VoyaRow);
        }
    };
});
$__System.registerDynamic("10", ["11", "12"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var toObject = $__require('11');
  $__require('12')('keys', function($keys) {
    return function keys(it) {
      return $keys(toObject(it));
    };
  });
  return module.exports;
});

$__System.registerDynamic("13", ["10", "14"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  $__require('10');
  module.exports = $__require('14').Object.keys;
  return module.exports;
});

$__System.registerDynamic("d", ["13"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = {
    "default": $__require('13'),
    __esModule: true
  };
  return module.exports;
});

$__System.register("15", [], function (_export) {
    "use strict";

    _export("VoyaCellTemplate", VoyaCellTemplate);

    function VoyaCellTemplate() {
        function render(el) {
            el.style.width = el.width;
            var content = el.cellTemplate ? el.cellTemplate : el.cellValue;
            var method = !el.mobile ? "add" : "remove";
            el.classList[method]("non-mobile");
            var method2 = !el.label ? "add" : "remove";
            el.classList[method2]("non-label");
            return "<div class=\"voya-cell " + el.cellName + "\"><span class=\"label\">" + el.label + ": </span>" + content + "</div>";
        }
        return {
            render: render
        };
    }

    return {
        setters: [],
        execute: function () {}
    };
});
$__System.register('16', ['4', '5', '6', '7', '15', '17', 'a', 'b', 'd'], function (_export) {
    var _defineDecoratedPropertyDescriptor, _createDecoratedClass, _classCallCheck, property, nullable, VoyaCellTemplate, getNestedData, _get, _inherits, _Object$keys, VoyaCell;

    return {
        setters: [function (_) {
            _defineDecoratedPropertyDescriptor = _['default'];
        }, function (_2) {
            _createDecoratedClass = _2['default'];
        }, function (_3) {
            _classCallCheck = _3['default'];
        }, function (_5) {
            property = _5.property;
            nullable = _5.nullable;
        }, function (_4) {
            VoyaCellTemplate = _4.VoyaCellTemplate;
        }, function (_6) {
            getNestedData = _6.getNestedData;
        }, function (_a) {
            _get = _a['default'];
        }, function (_b) {
            _inherits = _b['default'];
        }, function (_d) {
            _Object$keys = _d['default'];
        }],
        execute: function () {
            'use strict';

            VoyaCell = (function (_ref) {
                var _instanceInitializers = {};

                _inherits(VoyaCell, _ref);

                function VoyaCell() {
                    _classCallCheck(this, VoyaCell);

                    _get(Object.getPrototypeOf(VoyaCell.prototype), 'constructor', this).apply(this, arguments);

                    _defineDecoratedPropertyDescriptor(this, 'cellName', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'width', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'template', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'cellValue', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'cellData', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'cellTemplate', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'mobile', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'label', _instanceInitializers);
                }

                _createDecoratedClass(VoyaCell, [{
                    key: 'createdCallback',
                    value: function createdCallback() {
                        this.template = VoyaCellTemplate();
                        this.cellData = {};
                    }
                }, {
                    key: 'propertyChangedCallback',
                    value: function propertyChangedCallback(prop, oldValue, newValue) {
                        if (prop !== "cellName" && prop !== "cellValue" && oldValue === newValue) return;
                        this.innerHTML = this.template.render(this);
                    }
                }, {
                    key: 'renderCellTemplate',
                    value: function renderCellTemplate() {
                        this.mapCellData();
                        this.repaintCellTemplate();
                    }
                }, {
                    key: 'mapCellData',
                    value: function mapCellData() {
                        this.cellTemplate.split('$').slice(1).map(function (dataProperty) {
                            return dataProperty.substring(1, dataProperty.indexOf("}"));
                        }).forEach((function (property) {
                            var primaryValue = property.indexOf('^') != -1 ? property.substring(1) : null;
                            if (primaryValue) {
                                this.cellName = this.cellName === primaryValue ? primaryValue + "^" : primaryValue;
                            }
                            this.cellData[primaryValue ? primaryValue : property] = primaryValue ? this.cellName : property;
                        }).bind(this));

                        for (var property in this.cellData) {
                            this.cellData[property] = this.cellData[property].charAt(this.cellData[property].length - 1) != "^" ? getNestedData(property, this.cellValue) : this.cellValue;
                        }
                    }
                }, {
                    key: 'parseCellData',
                    value: function parseCellData(property, data) {
                        for (var dataProperty in data) {
                            if (typeof data[dataProperty] === 'object' && dataProperty != property) {
                                this.parseCellData(dataProperty, data[dataProperty]);
                                return;
                            } else {
                                this.cellData[property] = data[property];
                                return;
                            }
                        }
                    }
                }, {
                    key: 'repaintCellTemplate',
                    value: function repaintCellTemplate() {
                        _Object$keys(this.cellData).forEach((function (item) {
                            var replace = new RegExp("\(\\$\\{(\\^?)" + item + "\\}\)");
                            this.cellTemplate = this.cellTemplate.replace(replace, this.cellData[item]);
                        }).bind(this));
                    }
                }, {
                    key: 'cellName',
                    decorators: [property],
                    initializer: null,
                    enumerable: true
                }, {
                    key: 'width',
                    decorators: [property],
                    initializer: null,
                    enumerable: true
                }, {
                    key: 'template',
                    decorators: [nullable, property],
                    initializer: null,
                    enumerable: true
                }, {
                    key: 'cellValue',
                    decorators: [nullable, property],
                    initializer: null,
                    enumerable: true
                }, {
                    key: 'cellData',
                    decorators: [property],
                    initializer: function initializer() {
                        return {};
                    },
                    enumerable: true
                }, {
                    key: 'cellTemplate',
                    decorators: [property],
                    initializer: null,
                    enumerable: true
                }, {
                    key: 'mobile',
                    decorators: [nullable, property],
                    initializer: null,
                    enumerable: true
                }, {
                    key: 'label',
                    decorators: [nullable, property],
                    initializer: null,
                    enumerable: true
                }], null, _instanceInitializers);

                return VoyaCell;
            })(HTMLElement || Element);

            _export('VoyaCell', VoyaCell);

            document.registerElement('voya-cell', VoyaCell);
        }
    };
});
$__System.registerDynamic("12", ["18", "14", "19"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var $export = $__require('18'),
      core = $__require('14'),
      fails = $__require('19');
  module.exports = function(KEY, exec) {
    var fn = (core.Object || {})[KEY] || Object[KEY],
        exp = {};
    exp[KEY] = exec(fn);
    $export($export.S + $export.F * fails(function() {
      fn(1);
    }), 'Object', exp);
  };
  return module.exports;
});

$__System.registerDynamic("1a", ["1b", "12"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var toIObject = $__require('1b');
  $__require('12')('getOwnPropertyDescriptor', function($getOwnPropertyDescriptor) {
    return function getOwnPropertyDescriptor(it, key) {
      return $getOwnPropertyDescriptor(toIObject(it), key);
    };
  });
  return module.exports;
});

$__System.registerDynamic("1c", ["1d", "1a"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var $ = $__require('1d');
  $__require('1a');
  module.exports = function getOwnPropertyDescriptor(it, key) {
    return $.getDesc(it, key);
  };
  return module.exports;
});

$__System.registerDynamic("1e", ["1c"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = {
    "default": $__require('1c'),
    __esModule: true
  };
  return module.exports;
});

$__System.registerDynamic("a", ["1e"], true, function($__require, exports, module) {
  "use strict";
  ;
  var define,
      global = this,
      GLOBAL = this;
  var _Object$getOwnPropertyDescriptor = $__require('1e')["default"];
  exports["default"] = function get(_x, _x2, _x3) {
    var _again = true;
    _function: while (_again) {
      var object = _x,
          property = _x2,
          receiver = _x3;
      _again = false;
      if (object === null)
        object = Function.prototype;
      var desc = _Object$getOwnPropertyDescriptor(object, property);
      if (desc === undefined) {
        var parent = Object.getPrototypeOf(object);
        if (parent === null) {
          return undefined;
        } else {
          _x = parent;
          _x2 = property;
          _x3 = receiver;
          _again = true;
          desc = parent = undefined;
          continue _function;
        }
      } else if ("value" in desc) {
        return desc.value;
      } else {
        var getter = desc.get;
        if (getter === undefined) {
          return undefined;
        }
        return getter.call(receiver);
      }
    }
  };
  exports.__esModule = true;
  return module.exports;
});

$__System.registerDynamic("1f", ["1d"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var $ = $__require('1d');
  module.exports = function create(P, D) {
    return $.create(P, D);
  };
  return module.exports;
});

$__System.registerDynamic("20", ["1f"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = {
    "default": $__require('1f'),
    __esModule: true
  };
  return module.exports;
});

$__System.registerDynamic("21", ["1d", "22", "23", "24"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var getDesc = $__require('1d').getDesc,
      isObject = $__require('22'),
      anObject = $__require('23');
  var check = function(O, proto) {
    anObject(O);
    if (!isObject(proto) && proto !== null)
      throw TypeError(proto + ": can't set as prototype!");
  };
  module.exports = {
    set: Object.setPrototypeOf || ('__proto__' in {} ? function(test, buggy, set) {
      try {
        set = $__require('24')(Function.call, getDesc(Object.prototype, '__proto__').set, 2);
        set(test, []);
        buggy = !(test instanceof Array);
      } catch (e) {
        buggy = true;
      }
      return function setPrototypeOf(O, proto) {
        check(O, proto);
        if (buggy)
          O.__proto__ = proto;
        else
          set(O, proto);
        return O;
      };
    }({}, false) : undefined),
    check: check
  };
  return module.exports;
});

$__System.registerDynamic("25", ["18", "21"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var $export = $__require('18');
  $export($export.S, 'Object', {setPrototypeOf: $__require('21').set});
  return module.exports;
});

$__System.registerDynamic("26", ["25", "14"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  $__require('25');
  module.exports = $__require('14').Object.setPrototypeOf;
  return module.exports;
});

$__System.registerDynamic("27", ["26"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = {
    "default": $__require('26'),
    __esModule: true
  };
  return module.exports;
});

$__System.registerDynamic("b", ["20", "27"], true, function($__require, exports, module) {
  "use strict";
  ;
  var define,
      global = this,
      GLOBAL = this;
  var _Object$create = $__require('20')["default"];
  var _Object$setPrototypeOf = $__require('27')["default"];
  exports["default"] = function(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }
    subClass.prototype = _Object$create(superClass && superClass.prototype, {constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }});
    if (superClass)
      _Object$setPrototypeOf ? _Object$setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  };
  exports.__esModule = true;
  return module.exports;
});

$__System.registerDynamic("4", ["28"], true, function($__require, exports, module) {
  "use strict";
  ;
  var define,
      global = this,
      GLOBAL = this;
  var _Object$defineProperty = $__require('28')["default"];
  exports["default"] = function(target, key, descriptors) {
    var _descriptor = descriptors[key];
    if (!_descriptor)
      return;
    var descriptor = {};
    for (var _key in _descriptor)
      descriptor[_key] = _descriptor[_key];
    descriptor.value = descriptor.initializer ? descriptor.initializer.call(target) : undefined;
    _Object$defineProperty(target, key, descriptor);
  };
  exports.__esModule = true;
  return module.exports;
});

$__System.registerDynamic("29", ["1d"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var $ = $__require('1d');
  module.exports = function defineProperty(it, key, desc) {
    return $.setDesc(it, key, desc);
  };
  return module.exports;
});

$__System.registerDynamic("28", ["29"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = {
    "default": $__require('29'),
    __esModule: true
  };
  return module.exports;
});

$__System.registerDynamic("5", ["28"], true, function($__require, exports, module) {
  "use strict";
  ;
  var define,
      global = this,
      GLOBAL = this;
  var _Object$defineProperty = $__require('28')["default"];
  exports["default"] = (function() {
    function defineProperties(target, descriptors, initializers) {
      for (var i = 0; i < descriptors.length; i++) {
        var descriptor = descriptors[i];
        var decorators = descriptor.decorators;
        var key = descriptor.key;
        delete descriptor.key;
        delete descriptor.decorators;
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor || descriptor.initializer)
          descriptor.writable = true;
        if (decorators) {
          for (var f = 0; f < decorators.length; f++) {
            var decorator = decorators[f];
            if (typeof decorator === "function") {
              descriptor = decorator(target, key, descriptor) || descriptor;
            } else {
              throw new TypeError("The decorator for method " + descriptor.key + " is of the invalid type " + typeof decorator);
            }
          }
          if (descriptor.initializer !== undefined) {
            initializers[key] = descriptor;
            continue;
          }
        }
        _Object$defineProperty(target, key, descriptor);
      }
    }
    return function(Constructor, protoProps, staticProps, protoInitializers, staticInitializers) {
      if (protoProps)
        defineProperties(Constructor.prototype, protoProps, protoInitializers);
      if (staticProps)
        defineProperties(Constructor, staticProps, staticInitializers);
      return Constructor;
    };
  })();
  exports.__esModule = true;
  return module.exports;
});

$__System.registerDynamic("6", [], true, function($__require, exports, module) {
  "use strict";
  ;
  var define,
      global = this,
      GLOBAL = this;
  exports["default"] = function(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };
  exports.__esModule = true;
  return module.exports;
});

$__System.registerDynamic("2a", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  "format cjs";
  return module.exports;
});

$__System.registerDynamic("2b", ["2c"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var cof = $__require('2c');
  module.exports = Array.isArray || function(arg) {
    return cof(arg) == 'Array';
  };
  return module.exports;
});

$__System.registerDynamic("2d", ["22", "2b", "2e"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var isObject = $__require('22'),
      isArray = $__require('2b'),
      SPECIES = $__require('2e')('species');
  module.exports = function(original, length) {
    var C;
    if (isArray(original)) {
      C = original.constructor;
      if (typeof C == 'function' && (C === Array || isArray(C.prototype)))
        C = undefined;
      if (isObject(C)) {
        C = C[SPECIES];
        if (C === null)
          C = undefined;
      }
    }
    return new (C === undefined ? Array : C)(length);
  };
  return module.exports;
});

$__System.registerDynamic("2f", ["24", "30", "11", "31", "2d"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var ctx = $__require('24'),
      IObject = $__require('30'),
      toObject = $__require('11'),
      toLength = $__require('31'),
      asc = $__require('2d');
  module.exports = function(TYPE) {
    var IS_MAP = TYPE == 1,
        IS_FILTER = TYPE == 2,
        IS_SOME = TYPE == 3,
        IS_EVERY = TYPE == 4,
        IS_FIND_INDEX = TYPE == 6,
        NO_HOLES = TYPE == 5 || IS_FIND_INDEX;
    return function($this, callbackfn, that) {
      var O = toObject($this),
          self = IObject(O),
          f = ctx(callbackfn, that, 3),
          length = toLength(self.length),
          index = 0,
          result = IS_MAP ? asc($this, length) : IS_FILTER ? asc($this, 0) : undefined,
          val,
          res;
      for (; length > index; index++)
        if (NO_HOLES || index in self) {
          val = self[index];
          res = f(val, index, O);
          if (TYPE) {
            if (IS_MAP)
              result[index] = res;
            else if (res)
              switch (TYPE) {
                case 3:
                  return true;
                case 5:
                  return val;
                case 6:
                  return index;
                case 2:
                  result.push(val);
              }
            else if (IS_EVERY)
              return false;
          }
        }
      return IS_FIND_INDEX ? -1 : IS_SOME || IS_EVERY ? IS_EVERY : result;
    };
  };
  return module.exports;
});

$__System.registerDynamic("32", ["33", "34", "23", "22", "35", "36", "2f", "37", "38"], true, function($__require, exports, module) {
  "use strict";
  ;
  var define,
      global = this,
      GLOBAL = this;
  var hide = $__require('33'),
      redefineAll = $__require('34'),
      anObject = $__require('23'),
      isObject = $__require('22'),
      strictNew = $__require('35'),
      forOf = $__require('36'),
      createArrayMethod = $__require('2f'),
      $has = $__require('37'),
      WEAK = $__require('38')('weak'),
      isExtensible = Object.isExtensible || isObject,
      arrayFind = createArrayMethod(5),
      arrayFindIndex = createArrayMethod(6),
      id = 0;
  var frozenStore = function(that) {
    return that._l || (that._l = new FrozenStore);
  };
  var FrozenStore = function() {
    this.a = [];
  };
  var findFrozen = function(store, key) {
    return arrayFind(store.a, function(it) {
      return it[0] === key;
    });
  };
  FrozenStore.prototype = {
    get: function(key) {
      var entry = findFrozen(this, key);
      if (entry)
        return entry[1];
    },
    has: function(key) {
      return !!findFrozen(this, key);
    },
    set: function(key, value) {
      var entry = findFrozen(this, key);
      if (entry)
        entry[1] = value;
      else
        this.a.push([key, value]);
    },
    'delete': function(key) {
      var index = arrayFindIndex(this.a, function(it) {
        return it[0] === key;
      });
      if (~index)
        this.a.splice(index, 1);
      return !!~index;
    }
  };
  module.exports = {
    getConstructor: function(wrapper, NAME, IS_MAP, ADDER) {
      var C = wrapper(function(that, iterable) {
        strictNew(that, C, NAME);
        that._i = id++;
        that._l = undefined;
        if (iterable != undefined)
          forOf(iterable, IS_MAP, that[ADDER], that);
      });
      redefineAll(C.prototype, {
        'delete': function(key) {
          if (!isObject(key))
            return false;
          if (!isExtensible(key))
            return frozenStore(this)['delete'](key);
          return $has(key, WEAK) && $has(key[WEAK], this._i) && delete key[WEAK][this._i];
        },
        has: function has(key) {
          if (!isObject(key))
            return false;
          if (!isExtensible(key))
            return frozenStore(this).has(key);
          return $has(key, WEAK) && $has(key[WEAK], this._i);
        }
      });
      return C;
    },
    def: function(that, key, value) {
      if (!isExtensible(anObject(key))) {
        frozenStore(that).set(key, value);
      } else {
        $has(key, WEAK) || hide(key, WEAK, {});
        key[WEAK][that._i] = value;
      }
      return that;
    },
    frozenStore: frozenStore,
    WEAK: WEAK
  };
  return module.exports;
});

$__System.registerDynamic("34", ["39"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var redefine = $__require('39');
  module.exports = function(target, src) {
    for (var key in src)
      redefine(target, key, src[key]);
    return target;
  };
  return module.exports;
});

$__System.registerDynamic("3a", ["23"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var anObject = $__require('23');
  module.exports = function(iterator, fn, value, entries) {
    try {
      return entries ? fn(anObject(value)[0], value[1]) : fn(value);
    } catch (e) {
      var ret = iterator['return'];
      if (ret !== undefined)
        anObject(ret.call(iterator));
      throw e;
    }
  };
  return module.exports;
});

$__System.registerDynamic("3b", ["3c", "2e"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var Iterators = $__require('3c'),
      ITERATOR = $__require('2e')('iterator'),
      ArrayProto = Array.prototype;
  module.exports = function(it) {
    return it !== undefined && (Iterators.Array === it || ArrayProto[ITERATOR] === it);
  };
  return module.exports;
});

$__System.registerDynamic("31", ["3d"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var toInteger = $__require('3d'),
      min = Math.min;
  module.exports = function(it) {
    return it > 0 ? min(toInteger(it), 0x1fffffffffffff) : 0;
  };
  return module.exports;
});

$__System.registerDynamic("36", ["24", "3a", "3b", "23", "31", "3e"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var ctx = $__require('24'),
      call = $__require('3a'),
      isArrayIter = $__require('3b'),
      anObject = $__require('23'),
      toLength = $__require('31'),
      getIterFn = $__require('3e');
  module.exports = function(iterable, entries, fn, that) {
    var iterFn = getIterFn(iterable),
        f = ctx(fn, that, entries ? 2 : 1),
        index = 0,
        length,
        step,
        iterator;
    if (typeof iterFn != 'function')
      throw TypeError(iterable + ' is not iterable!');
    if (isArrayIter(iterFn))
      for (length = toLength(iterable.length); length > index; index++) {
        entries ? f(anObject(step = iterable[index])[0], step[1]) : f(iterable[index]);
      }
    else
      for (iterator = iterFn.call(iterable); !(step = iterator.next()).done; ) {
        call(iterator, f, step.value, entries);
      }
  };
  return module.exports;
});

$__System.registerDynamic("35", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = function(it, Constructor, name) {
    if (!(it instanceof Constructor))
      throw TypeError(name + ": use the 'new' operator!");
    return it;
  };
  return module.exports;
});

$__System.registerDynamic("3f", ["1d", "40", "18", "19", "33", "34", "36", "35", "22", "41", "42"], true, function($__require, exports, module) {
  "use strict";
  ;
  var define,
      global = this,
      GLOBAL = this;
  var $ = $__require('1d'),
      global = $__require('40'),
      $export = $__require('18'),
      fails = $__require('19'),
      hide = $__require('33'),
      redefineAll = $__require('34'),
      forOf = $__require('36'),
      strictNew = $__require('35'),
      isObject = $__require('22'),
      setToStringTag = $__require('41'),
      DESCRIPTORS = $__require('42');
  module.exports = function(NAME, wrapper, methods, common, IS_MAP, IS_WEAK) {
    var Base = global[NAME],
        C = Base,
        ADDER = IS_MAP ? 'set' : 'add',
        proto = C && C.prototype,
        O = {};
    if (!DESCRIPTORS || typeof C != 'function' || !(IS_WEAK || proto.forEach && !fails(function() {
      new C().entries().next();
    }))) {
      C = common.getConstructor(wrapper, NAME, IS_MAP, ADDER);
      redefineAll(C.prototype, methods);
    } else {
      C = wrapper(function(target, iterable) {
        strictNew(target, C, NAME);
        target._c = new Base;
        if (iterable != undefined)
          forOf(iterable, IS_MAP, target[ADDER], target);
      });
      $.each.call('add,clear,delete,forEach,get,has,set,keys,values,entries'.split(','), function(KEY) {
        var IS_ADDER = KEY == 'add' || KEY == 'set';
        if (KEY in proto && !(IS_WEAK && KEY == 'clear'))
          hide(C.prototype, KEY, function(a, b) {
            if (!IS_ADDER && IS_WEAK && !isObject(a))
              return KEY == 'get' ? undefined : false;
            var result = this._c[KEY](a === 0 ? 0 : a, b);
            return IS_ADDER ? this : result;
          });
      });
      if ('size' in proto)
        $.setDesc(C.prototype, 'size', {get: function() {
            return this._c.size;
          }});
    }
    setToStringTag(C, NAME);
    O[NAME] = C;
    $export($export.G + $export.W + $export.F, O);
    if (!IS_WEAK)
      common.setStrong(C, NAME, IS_MAP);
    return C;
  };
  return module.exports;
});

$__System.registerDynamic("43", ["1d", "39", "32", "22", "37", "3f"], true, function($__require, exports, module) {
  "use strict";
  ;
  var define,
      global = this,
      GLOBAL = this;
  var $ = $__require('1d'),
      redefine = $__require('39'),
      weak = $__require('32'),
      isObject = $__require('22'),
      has = $__require('37'),
      frozenStore = weak.frozenStore,
      WEAK = weak.WEAK,
      isExtensible = Object.isExtensible || isObject,
      tmp = {};
  var $WeakMap = $__require('3f')('WeakMap', function(get) {
    return function WeakMap() {
      return get(this, arguments.length > 0 ? arguments[0] : undefined);
    };
  }, {
    get: function get(key) {
      if (isObject(key)) {
        if (!isExtensible(key))
          return frozenStore(this).get(key);
        if (has(key, WEAK))
          return key[WEAK][this._i];
      }
    },
    set: function set(key, value) {
      return weak.def(this, key, value);
    }
  }, weak, true, true);
  if (new $WeakMap().set((Object.freeze || Object)(tmp), 7).get(tmp) != 7) {
    $.each.call(['delete', 'has', 'get', 'set'], function(key) {
      var proto = $WeakMap.prototype,
          method = proto[key];
      redefine(proto, key, function(a, b) {
        if (isObject(a) && !isExtensible(a)) {
          var result = frozenStore(this)[key](a, b);
          return key == 'set' ? this : result;
        }
        return method.call(this, a, b);
      });
    });
  }
  return module.exports;
});

$__System.registerDynamic("44", ["2a", "45", "43", "14"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  $__require('2a');
  $__require('45');
  $__require('43');
  module.exports = $__require('14').WeakMap;
  return module.exports;
});

$__System.registerDynamic("c", ["44"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = {
    "default": $__require('44'),
    __esModule: true
  };
  return module.exports;
});

$__System.registerDynamic("46", ["1d", "18", "24", "14"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var $ = $__require('1d'),
      $export = $__require('18'),
      $ctx = $__require('24'),
      $Array = $__require('14').Array || Array,
      statics = {};
  var setStatics = function(keys, length) {
    $.each.call(keys.split(','), function(key) {
      if (length == undefined && key in $Array)
        statics[key] = $Array[key];
      else if (key in [])
        statics[key] = $ctx(Function.call, [][key], length);
    });
  };
  setStatics('pop,reverse,shift,keys,values,entries', 1);
  setStatics('indexOf,every,some,forEach,map,filter,find,findIndex,includes', 3);
  setStatics('join,slice,concat,push,splice,unshift,sort,lastIndexOf,' + 'reduce,reduceRight,copyWithin,fill');
  $export($export.S, 'Array', statics);
  return module.exports;
});

$__System.registerDynamic("47", ["46", "14"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  $__require('46');
  module.exports = $__require('14').Array.slice;
  return module.exports;
});

$__System.registerDynamic("48", ["47"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = {
    "default": $__require('47'),
    __esModule: true
  };
  return module.exports;
});

$__System.register("49", [], function (_export) {
	"use strict";

	_export("VoyaTableTemplate", VoyaTableTemplate);

	function VoyaTableTemplate() {
		function render(data) {
			return buildWrapper(data);
		}
		function buildWrapper(data) {
			return "<div class=\"deep-ui-voya-table\">\n\t\t\t\t\t<div class=\"voya-table-column-wrapper\">\n\t\t\t\t\t</div>\n\t\t\t\t\t<div class=\"voya-table-rows-wrapper\">\n\t\t\t\t\t</div>\n\t\t\t\t</div>";
		}
		function addColumns(el) {
			el.columns.forEach(function (col) {
				el.querySelector(".voya-table-column-wrapper").appendChild(col);
			});
		}
		function addRows(el) {
			el.rows.forEach(function (row) {
				el.querySelector(".voya-table-rows-wrapper").appendChild(row);
			});
		}

		return {
			render: render,
			addColumns: addColumns,
			addRows: addRows
		};
	}

	return {
		setters: [],
		execute: function () {}
	};
});
$__System.registerDynamic("4a", ["4b", "2e", "3c", "14"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var classof = $__require('4b'),
      ITERATOR = $__require('2e')('iterator'),
      Iterators = $__require('3c');
  module.exports = $__require('14').isIterable = function(it) {
    var O = Object(it);
    return O[ITERATOR] !== undefined || '@@iterator' in O || Iterators.hasOwnProperty(classof(O));
  };
  return module.exports;
});

$__System.registerDynamic("4c", ["45", "4d", "4a"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  $__require('45');
  $__require('4d');
  module.exports = $__require('4a');
  return module.exports;
});

$__System.registerDynamic("4e", ["4c"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = {
    "default": $__require('4c'),
    __esModule: true
  };
  return module.exports;
});

$__System.registerDynamic("4f", ["50", "4e"], true, function($__require, exports, module) {
  "use strict";
  ;
  var define,
      global = this,
      GLOBAL = this;
  var _getIterator = $__require('50')["default"];
  var _isIterable = $__require('4e')["default"];
  exports["default"] = (function() {
    function sliceIterator(arr, i) {
      var _arr = [];
      var _n = true;
      var _d = false;
      var _e = undefined;
      try {
        for (var _i = _getIterator(arr),
            _s; !(_n = (_s = _i.next()).done); _n = true) {
          _arr.push(_s.value);
          if (i && _arr.length === i)
            break;
        }
      } catch (err) {
        _d = true;
        _e = err;
      } finally {
        try {
          if (!_n && _i["return"])
            _i["return"]();
        } finally {
          if (_d)
            throw _e;
        }
      }
      return _arr;
    }
    return function(arr, i) {
      if (Array.isArray(arr)) {
        return arr;
      } else if (_isIterable(Object(arr))) {
        return sliceIterator(arr, i);
      } else {
        throw new TypeError("Invalid attempt to destructure non-iterable instance");
      }
    };
  })();
  exports.__esModule = true;
  return module.exports;
});

$__System.registerDynamic("51", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = function() {};
  return module.exports;
});

$__System.registerDynamic("52", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = function(done, value) {
    return {
      value: value,
      done: !!done
    };
  };
  return module.exports;
});

$__System.registerDynamic("53", ["51", "52", "3c", "1b", "54"], true, function($__require, exports, module) {
  "use strict";
  ;
  var define,
      global = this,
      GLOBAL = this;
  var addToUnscopables = $__require('51'),
      step = $__require('52'),
      Iterators = $__require('3c'),
      toIObject = $__require('1b');
  module.exports = $__require('54')(Array, 'Array', function(iterated, kind) {
    this._t = toIObject(iterated);
    this._i = 0;
    this._k = kind;
  }, function() {
    var O = this._t,
        kind = this._k,
        index = this._i++;
    if (!O || index >= O.length) {
      this._t = undefined;
      return step(1);
    }
    if (kind == 'keys')
      return step(0, index);
    if (kind == 'values')
      return step(0, O[index]);
    return step(0, [index, O[index]]);
  }, 'values');
  Iterators.Arguments = Iterators.Array;
  addToUnscopables('keys');
  addToUnscopables('values');
  addToUnscopables('entries');
  return module.exports;
});

$__System.registerDynamic("45", ["53", "3c"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  $__require('53');
  var Iterators = $__require('3c');
  Iterators.NodeList = Iterators.HTMLCollection = Iterators.Array;
  return module.exports;
});

$__System.registerDynamic("3d", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var ceil = Math.ceil,
      floor = Math.floor;
  module.exports = function(it) {
    return isNaN(it = +it) ? 0 : (it > 0 ? floor : ceil)(it);
  };
  return module.exports;
});

$__System.registerDynamic("55", ["3d", "56"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var toInteger = $__require('3d'),
      defined = $__require('56');
  module.exports = function(TO_STRING) {
    return function(that, pos) {
      var s = String(defined(that)),
          i = toInteger(pos),
          l = s.length,
          a,
          b;
      if (i < 0 || i >= l)
        return TO_STRING ? '' : undefined;
      a = s.charCodeAt(i);
      return a < 0xd800 || a > 0xdbff || i + 1 === l || (b = s.charCodeAt(i + 1)) < 0xdc00 || b > 0xdfff ? TO_STRING ? s.charAt(i) : a : TO_STRING ? s.slice(i, i + 2) : (a - 0xd800 << 10) + (b - 0xdc00) + 0x10000;
    };
  };
  return module.exports;
});

$__System.registerDynamic("57", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = true;
  return module.exports;
});

$__System.registerDynamic("39", ["33"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('33');
  return module.exports;
});

$__System.registerDynamic("58", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = function(bitmap, value) {
    return {
      enumerable: !(bitmap & 1),
      configurable: !(bitmap & 2),
      writable: !(bitmap & 4),
      value: value
    };
  };
  return module.exports;
});

$__System.registerDynamic("42", ["19"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = !$__require('19')(function() {
    return Object.defineProperty({}, 'a', {get: function() {
        return 7;
      }}).a != 7;
  });
  return module.exports;
});

$__System.registerDynamic("33", ["1d", "58", "42"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var $ = $__require('1d'),
      createDesc = $__require('58');
  module.exports = $__require('42') ? function(object, key, value) {
    return $.setDesc(object, key, createDesc(1, value));
  } : function(object, key, value) {
    object[key] = value;
    return object;
  };
  return module.exports;
});

$__System.registerDynamic("59", ["1d", "58", "41", "33", "2e"], true, function($__require, exports, module) {
  "use strict";
  ;
  var define,
      global = this,
      GLOBAL = this;
  var $ = $__require('1d'),
      descriptor = $__require('58'),
      setToStringTag = $__require('41'),
      IteratorPrototype = {};
  $__require('33')(IteratorPrototype, $__require('2e')('iterator'), function() {
    return this;
  });
  module.exports = function(Constructor, NAME, next) {
    Constructor.prototype = $.create(IteratorPrototype, {next: descriptor(1, next)});
    setToStringTag(Constructor, NAME + ' Iterator');
  };
  return module.exports;
});

$__System.registerDynamic("37", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var hasOwnProperty = {}.hasOwnProperty;
  module.exports = function(it, key) {
    return hasOwnProperty.call(it, key);
  };
  return module.exports;
});

$__System.registerDynamic("41", ["1d", "37", "2e"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var def = $__require('1d').setDesc,
      has = $__require('37'),
      TAG = $__require('2e')('toStringTag');
  module.exports = function(it, tag, stat) {
    if (it && !has(it = stat ? it : it.prototype, TAG))
      def(it, TAG, {
        configurable: true,
        value: tag
      });
  };
  return module.exports;
});

$__System.registerDynamic("54", ["57", "18", "39", "33", "37", "3c", "59", "41", "1d", "2e"], true, function($__require, exports, module) {
  "use strict";
  ;
  var define,
      global = this,
      GLOBAL = this;
  var LIBRARY = $__require('57'),
      $export = $__require('18'),
      redefine = $__require('39'),
      hide = $__require('33'),
      has = $__require('37'),
      Iterators = $__require('3c'),
      $iterCreate = $__require('59'),
      setToStringTag = $__require('41'),
      getProto = $__require('1d').getProto,
      ITERATOR = $__require('2e')('iterator'),
      BUGGY = !([].keys && 'next' in [].keys()),
      FF_ITERATOR = '@@iterator',
      KEYS = 'keys',
      VALUES = 'values';
  var returnThis = function() {
    return this;
  };
  module.exports = function(Base, NAME, Constructor, next, DEFAULT, IS_SET, FORCED) {
    $iterCreate(Constructor, NAME, next);
    var getMethod = function(kind) {
      if (!BUGGY && kind in proto)
        return proto[kind];
      switch (kind) {
        case KEYS:
          return function keys() {
            return new Constructor(this, kind);
          };
        case VALUES:
          return function values() {
            return new Constructor(this, kind);
          };
      }
      return function entries() {
        return new Constructor(this, kind);
      };
    };
    var TAG = NAME + ' Iterator',
        DEF_VALUES = DEFAULT == VALUES,
        VALUES_BUG = false,
        proto = Base.prototype,
        $native = proto[ITERATOR] || proto[FF_ITERATOR] || DEFAULT && proto[DEFAULT],
        $default = $native || getMethod(DEFAULT),
        methods,
        key;
    if ($native) {
      var IteratorPrototype = getProto($default.call(new Base));
      setToStringTag(IteratorPrototype, TAG, true);
      if (!LIBRARY && has(proto, FF_ITERATOR))
        hide(IteratorPrototype, ITERATOR, returnThis);
      if (DEF_VALUES && $native.name !== VALUES) {
        VALUES_BUG = true;
        $default = function values() {
          return $native.call(this);
        };
      }
    }
    if ((!LIBRARY || FORCED) && (BUGGY || VALUES_BUG || !proto[ITERATOR])) {
      hide(proto, ITERATOR, $default);
    }
    Iterators[NAME] = $default;
    Iterators[TAG] = returnThis;
    if (DEFAULT) {
      methods = {
        values: DEF_VALUES ? $default : getMethod(VALUES),
        keys: IS_SET ? $default : getMethod(KEYS),
        entries: !DEF_VALUES ? $default : getMethod('entries')
      };
      if (FORCED)
        for (key in methods) {
          if (!(key in proto))
            redefine(proto, key, methods[key]);
        }
      else
        $export($export.P + $export.F * (BUGGY || VALUES_BUG), NAME, methods);
    }
    return methods;
  };
  return module.exports;
});

$__System.registerDynamic("4d", ["55", "54"], true, function($__require, exports, module) {
  "use strict";
  ;
  var define,
      global = this,
      GLOBAL = this;
  var $at = $__require('55')(true);
  $__require('54')(String, 'String', function(iterated) {
    this._t = String(iterated);
    this._i = 0;
  }, function() {
    var O = this._t,
        index = this._i,
        point;
    if (index >= O.length)
      return {
        value: undefined,
        done: true
      };
    point = $at(O, index);
    this._i += point.length;
    return {
      value: point,
      done: false
    };
  });
  return module.exports;
});

$__System.registerDynamic("22", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = function(it) {
    return typeof it === 'object' ? it !== null : typeof it === 'function';
  };
  return module.exports;
});

$__System.registerDynamic("23", ["22"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var isObject = $__require('22');
  module.exports = function(it) {
    if (!isObject(it))
      throw TypeError(it + ' is not an object!');
    return it;
  };
  return module.exports;
});

$__System.registerDynamic("4b", ["2c", "2e"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var cof = $__require('2c'),
      TAG = $__require('2e')('toStringTag'),
      ARG = cof(function() {
        return arguments;
      }()) == 'Arguments';
  module.exports = function(it) {
    var O,
        T,
        B;
    return it === undefined ? 'Undefined' : it === null ? 'Null' : typeof(T = (O = Object(it))[TAG]) == 'string' ? T : ARG ? cof(O) : (B = cof(O)) == 'Object' && typeof O.callee == 'function' ? 'Arguments' : B;
  };
  return module.exports;
});

$__System.registerDynamic("5a", ["40"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var global = $__require('40'),
      SHARED = '__core-js_shared__',
      store = global[SHARED] || (global[SHARED] = {});
  module.exports = function(key) {
    return store[key] || (store[key] = {});
  };
  return module.exports;
});

$__System.registerDynamic("38", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var id = 0,
      px = Math.random();
  module.exports = function(key) {
    return 'Symbol('.concat(key === undefined ? '' : key, ')_', (++id + px).toString(36));
  };
  return module.exports;
});

$__System.registerDynamic("2e", ["5a", "38", "40"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var store = $__require('5a')('wks'),
      uid = $__require('38'),
      Symbol = $__require('40').Symbol;
  module.exports = function(name) {
    return store[name] || (store[name] = Symbol && Symbol[name] || (Symbol || uid)('Symbol.' + name));
  };
  return module.exports;
});

$__System.registerDynamic("3c", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = {};
  return module.exports;
});

$__System.registerDynamic("3e", ["4b", "2e", "3c", "14"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var classof = $__require('4b'),
      ITERATOR = $__require('2e')('iterator'),
      Iterators = $__require('3c');
  module.exports = $__require('14').getIteratorMethod = function(it) {
    if (it != undefined)
      return it[ITERATOR] || it['@@iterator'] || Iterators[classof(it)];
  };
  return module.exports;
});

$__System.registerDynamic("5b", ["23", "3e", "14"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var anObject = $__require('23'),
      get = $__require('3e');
  module.exports = $__require('14').getIterator = function(it) {
    var iterFn = get(it);
    if (typeof iterFn != 'function')
      throw TypeError(it + ' is not iterable!');
    return anObject(iterFn.call(it));
  };
  return module.exports;
});

$__System.registerDynamic("5c", ["45", "4d", "5b"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  $__require('45');
  $__require('4d');
  module.exports = $__require('5b');
  return module.exports;
});

$__System.registerDynamic("50", ["5c"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = {
    "default": $__require('5c'),
    __esModule: true
  };
  return module.exports;
});

$__System.registerDynamic("1b", ["30", "56"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var IObject = $__require('30'),
      defined = $__require('56');
  module.exports = function(it) {
    return IObject(defined(it));
  };
  return module.exports;
});

$__System.registerDynamic("5d", ["1d", "1b"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var $ = $__require('1d'),
      toIObject = $__require('1b'),
      isEnum = $.isEnum;
  module.exports = function(isEntries) {
    return function(it) {
      var O = toIObject(it),
          keys = $.getKeys(O),
          length = keys.length,
          i = 0,
          result = [],
          key;
      while (length > i)
        if (isEnum.call(O, key = keys[i++])) {
          result.push(isEntries ? [key, O[key]] : O[key]);
        }
      return result;
    };
  };
  return module.exports;
});

$__System.registerDynamic("5e", ["18", "5d"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var $export = $__require('18'),
      $entries = $__require('5d')(true);
  $export($export.S, 'Object', {entries: function entries(it) {
      return $entries(it);
    }});
  return module.exports;
});

$__System.registerDynamic("5f", ["5e", "14"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  $__require('5e');
  module.exports = $__require('14').Object.entries;
  return module.exports;
});

$__System.registerDynamic("60", ["5f"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = {
    "default": $__require('5f'),
    __esModule: true
  };
  return module.exports;
});

$__System.registerDynamic("61", [], true, function($__require, exports, module) {
  "use strict";
  ;
  var define,
      global = this,
      GLOBAL = this;
  function preserveCamelCase(str) {
    var isLastCharLower = false;
    for (var i = 0; i < str.length; i++) {
      var c = str.charAt(i);
      if (isLastCharLower && (/[a-zA-Z]/).test(c) && c.toUpperCase() === c) {
        str = str.substr(0, i) + '-' + str.substr(i);
        isLastCharLower = false;
        i++;
      } else {
        isLastCharLower = (c.toLowerCase() === c);
      }
    }
    return str;
  }
  module.exports = function() {
    var str = [].map.call(arguments, function(str) {
      return str.trim();
    }).filter(function(str) {
      return str.length;
    }).join('-');
    if (!str.length) {
      return '';
    }
    if (str.length === 1) {
      return str;
    }
    if (!(/[_.\- ]+/).test(str)) {
      if (str === str.toUpperCase()) {
        return str.toLowerCase();
      }
      if (str[0] !== str[0].toLowerCase()) {
        return str[0].toLowerCase() + str.slice(1);
      }
      return str;
    }
    str = preserveCamelCase(str);
    return str.replace(/^[_.\- ]+/, '').toLowerCase().replace(/[_.\- ]+(\w|$)/g, function(m, p1) {
      return p1.toUpperCase();
    });
  };
  return module.exports;
});

$__System.registerDynamic("62", ["61"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('61');
  return module.exports;
});

$__System.registerDynamic("63", [], true, function($__require, exports, module) {
  "use strict";
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = function(str, sep) {
    if (typeof str !== 'string') {
      throw new TypeError('Expected a string');
    }
    sep = typeof sep === 'undefined' ? '_' : sep;
    return str.replace(/([a-z\d])([A-Z])/g, '$1' + sep + '$2').replace(/([A-Z]+)([A-Z][a-z\d]+)/g, '$1' + sep + '$2').toLowerCase();
  };
  return module.exports;
});

$__System.registerDynamic("64", ["63"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('63');
  return module.exports;
});

$__System.registerDynamic("40", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var global = module.exports = typeof window != 'undefined' && window.Math == Math ? window : typeof self != 'undefined' && self.Math == Math ? self : Function('return this')();
  if (typeof __g == 'number')
    __g = global;
  return module.exports;
});

$__System.registerDynamic("65", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = function(it) {
    if (typeof it != 'function')
      throw TypeError(it + ' is not a function!');
    return it;
  };
  return module.exports;
});

$__System.registerDynamic("24", ["65"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var aFunction = $__require('65');
  module.exports = function(fn, that, length) {
    aFunction(fn);
    if (that === undefined)
      return fn;
    switch (length) {
      case 1:
        return function(a) {
          return fn.call(that, a);
        };
      case 2:
        return function(a, b) {
          return fn.call(that, a, b);
        };
      case 3:
        return function(a, b, c) {
          return fn.call(that, a, b, c);
        };
    }
    return function() {
      return fn.apply(that, arguments);
    };
  };
  return module.exports;
});

$__System.registerDynamic("18", ["40", "14", "24"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var global = $__require('40'),
      core = $__require('14'),
      ctx = $__require('24'),
      PROTOTYPE = 'prototype';
  var $export = function(type, name, source) {
    var IS_FORCED = type & $export.F,
        IS_GLOBAL = type & $export.G,
        IS_STATIC = type & $export.S,
        IS_PROTO = type & $export.P,
        IS_BIND = type & $export.B,
        IS_WRAP = type & $export.W,
        exports = IS_GLOBAL ? core : core[name] || (core[name] = {}),
        target = IS_GLOBAL ? global : IS_STATIC ? global[name] : (global[name] || {})[PROTOTYPE],
        key,
        own,
        out;
    if (IS_GLOBAL)
      source = name;
    for (key in source) {
      own = !IS_FORCED && target && key in target;
      if (own && key in exports)
        continue;
      out = own ? target[key] : source[key];
      exports[key] = IS_GLOBAL && typeof target[key] != 'function' ? source[key] : IS_BIND && own ? ctx(out, global) : IS_WRAP && target[key] == out ? (function(C) {
        var F = function(param) {
          return this instanceof C ? new C(param) : C(param);
        };
        F[PROTOTYPE] = C[PROTOTYPE];
        return F;
      })(out) : IS_PROTO && typeof out == 'function' ? ctx(Function.call, out) : out;
      if (IS_PROTO)
        (exports[PROTOTYPE] || (exports[PROTOTYPE] = {}))[key] = out;
    }
  };
  $export.F = 1;
  $export.G = 2;
  $export.S = 4;
  $export.P = 8;
  $export.B = 16;
  $export.W = 32;
  module.exports = $export;
  return module.exports;
});

$__System.registerDynamic("1d", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var $Object = Object;
  module.exports = {
    create: $Object.create,
    getProto: $Object.getPrototypeOf,
    isEnum: {}.propertyIsEnumerable,
    getDesc: $Object.getOwnPropertyDescriptor,
    setDesc: $Object.defineProperty,
    setDescs: $Object.defineProperties,
    getKeys: $Object.keys,
    getNames: $Object.getOwnPropertyNames,
    getSymbols: $Object.getOwnPropertySymbols,
    each: [].forEach
  };
  return module.exports;
});

$__System.registerDynamic("56", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = function(it) {
    if (it == undefined)
      throw TypeError("Can't call method on  " + it);
    return it;
  };
  return module.exports;
});

$__System.registerDynamic("11", ["56"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var defined = $__require('56');
  module.exports = function(it) {
    return Object(defined(it));
  };
  return module.exports;
});

$__System.registerDynamic("2c", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var toString = {}.toString;
  module.exports = function(it) {
    return toString.call(it).slice(8, -1);
  };
  return module.exports;
});

$__System.registerDynamic("30", ["2c"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var cof = $__require('2c');
  module.exports = Object('z').propertyIsEnumerable(0) ? Object : function(it) {
    return cof(it) == 'String' ? it.split('') : Object(it);
  };
  return module.exports;
});

$__System.registerDynamic("19", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = function(exec) {
    try {
      return !!exec();
    } catch (e) {
      return true;
    }
  };
  return module.exports;
});

$__System.registerDynamic("66", ["1d", "11", "30", "19"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var $ = $__require('1d'),
      toObject = $__require('11'),
      IObject = $__require('30');
  module.exports = $__require('19')(function() {
    var a = Object.assign,
        A = {},
        B = {},
        S = Symbol(),
        K = 'abcdefghijklmnopqrst';
    A[S] = 7;
    K.split('').forEach(function(k) {
      B[k] = k;
    });
    return a({}, A)[S] != 7 || Object.keys(a({}, B)).join('') != K;
  }) ? function assign(target, source) {
    var T = toObject(target),
        $$ = arguments,
        $$len = $$.length,
        index = 1,
        getKeys = $.getKeys,
        getSymbols = $.getSymbols,
        isEnum = $.isEnum;
    while ($$len > index) {
      var S = IObject($$[index++]),
          keys = getSymbols ? getKeys(S).concat(getSymbols(S)) : getKeys(S),
          length = keys.length,
          j = 0,
          key;
      while (length > j)
        if (isEnum.call(S, key = keys[j++]))
          T[key] = S[key];
    }
    return T;
  } : Object.assign;
  return module.exports;
});

$__System.registerDynamic("67", ["18", "66"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var $export = $__require('18');
  $export($export.S + $export.F, 'Object', {assign: $__require('66')});
  return module.exports;
});

$__System.registerDynamic("14", [], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  var core = module.exports = {version: '1.2.6'};
  if (typeof __e == 'number')
    __e = core;
  return module.exports;
});

$__System.registerDynamic("68", ["67", "14"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  $__require('67');
  module.exports = $__require('14').Object.assign;
  return module.exports;
});

$__System.registerDynamic("69", ["68"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = {
    "default": $__require('68'),
    __esModule: true
  };
  return module.exports;
});

$__System.register('6a', ['69'], function (_export) {
    var _Object$assign;

    function decorator(fn) {
        return function (options) {
            if (arguments.length <= 1) {
                return function (target, key, descriptor) {
                    _Object$assign(descriptor, options);

                    return fn.call(target, target, key, descriptor);
                };
            } else if (arguments.length === 3) {
                return fn.apply(arguments[0], arguments);
            } else {
                throw 'Illegal invocation of decorator';
            }
        };
    }

    /**
     * decorators take 3 arguments when invoked in a class definition
     * if it is invoked with less, this will return false
     * @returns {boolean}
     */

    function invokedAsDecorator() {
        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
        }
        return args.length === 3 || args.filter(function (item) {
            return typeof item === "function";
        }).length > 0;
    }

    /**
     * coerces a string value to a specified type
     * @param value
     * @param type
     * @returns {*}
     */

    function coerce(value, type) {
        switch (type) {
            case 'boolean':
                // if the attribute is present, with no value, it will evaluate to true
                // the attribute will only be false if it's value is "false" (case-insensitive)
                if (typeof value === 'string') {
                    value = !/false/i.test(value);
                }
            case 'object':
                if (typeof value === 'string' && value !== '') {
                    value = JSON.parse(value);
                }
            case 'integer':
                if (typeof value === 'string') {
                    value = parseInt(value);
                }
            case 'float':
                if (typeof value === 'string') {
                    value = parseFloat(value);
                }
        }
        return value;
    }

    return {
        setters: [function (_) {
            _Object$assign = _['default'];
        }],
        execute: function () {
            /**
             * a function which wraps a passed decorator `fn`
             * allows you to do either:
             *   @property
             *   test = {}
             * OR
             *   @property()
             *   test = {}
             * OR
             *   @property({option1: true})
             *   test = {}
             *
             * it tacks on options to the descriptor object
             *
             * @param {Function} fn signature: (target, key, descriptor)
             * @returns {Function} method/property decorator
             */
            'use strict';

            _export('decorator', decorator);

            _export('invokedAsDecorator', invokedAsDecorator);

            _export('coerce', coerce);
        }
    };
});
$__System.register('7', ['50', '60', '62', '64', '69', '4f', '6a'], function (_export) {
    var _getIterator, _Object$entries, camelcase, decamelize, _Object$assign, _slicedToArray, decorator, coerce, property, nullable, ui;

    /** Helper Methods **/
    function ensurePrototypeProperties(target) {
        if (!target._initializers && !target._attributes) {
            Object.defineProperty(target, '_initializers', {
                value: {},
                enumerable: false,
                writable: false,
                configurable: false
            });

            Object.defineProperty(target, '_attributes', {
                value: {},
                enumerable: false,
                writable: false,
                configurable: false
            });

            var createdCallback = target.createdCallback;
            target.createdCallback = function () {
                ensureInstanceProperties(this);

                // initializers first
                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                    for (var _iterator = _getIterator(_Object$entries(this._initializers)), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        var _step$value = _slicedToArray(_step.value, 2);

                        var prop = _step$value[0];
                        var initializer = _step$value[1];

                        this._properties[prop] = initializer();
                    }

                    // then attribute values
                } catch (err) {
                    _didIteratorError = true;
                    _iteratorError = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion && _iterator['return']) {
                            _iterator['return']();
                        }
                    } finally {
                        if (_didIteratorError) {
                            throw _iteratorError;
                        }
                    }
                }

                var _iteratorNormalCompletion2 = true;
                var _didIteratorError2 = false;
                var _iteratorError2 = undefined;

                try {
                    for (var _iterator2 = _getIterator(_Object$entries(this._attributes)), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                        var _step2$value = _slicedToArray(_step2.value, 2);

                        var prop = _step2$value[0];
                        var type = _step2$value[1];

                        var attr = decamelize(prop, '-');
                        var value = this.getAttribute(attr);
                        if (value != 'undefined') {
                            this._properties[prop] = coerce(this.getAttribute(attr), type);
                        }
                    }
                } catch (err) {
                    _didIteratorError2 = true;
                    _iteratorError2 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion2 && _iterator2['return']) {
                            _iterator2['return']();
                        }
                    } finally {
                        if (_didIteratorError2) {
                            throw _iteratorError2;
                        }
                    }
                }

                if (typeof createdCallback === 'function') {
                    return createdCallback.apply(this, arguments);
                }
            };

            var attributeChangedCallback = target.attributeChangedCallback;
            target.attributeChangedCallback = function (attr, oldValue, newValue) {
                var prop = camelcase(attr);

                if (prop in this._attributes) {
                    this[prop] = coerce(newValue, this._attributes[prop]);
                }

                if (typeof attributeChangedCallback === 'function') {
                    return attributeChangedCallback.apply(this, arguments);
                }
            };
        }
    }

    function ensureInstanceProperties(instance) {
        return instance._properties = instance._properties || {};
    }
    return {
        setters: [function (_2) {
            _getIterator = _2['default'];
        }, function (_3) {
            _Object$entries = _3['default'];
        }, function (_4) {
            camelcase = _4['default'];
        }, function (_5) {
            decamelize = _5['default'];
        }, function (_) {
            _Object$assign = _['default'];
        }, function (_f) {
            _slicedToArray = _f['default'];
        }, function (_a) {
            decorator = _a.decorator;
            coerce = _a.coerce;
        }],
        execute: function () {
            'use strict';

            property = decorator(function (target, key, descriptor) {
                ensurePrototypeProperties(target);

                // apply defaults
                descriptor = _Object$assign({
                    nullable: false,
                    synced: true, // if true, the html attribute value is synced to this property
                    type: undefined
                }, descriptor);

                // this ensures that ALL properties have an initializer, defaulting
                // to an initializer which returns undefined.
                // this is so all dev-defined properties will exist in the _properties hash
                // upon instantiation.
                target._initializers[key] = descriptor.initializer || function () {
                    return undefined;
                };

                // this is a list of all properties that are synced to HTML attributes
                // the type attribute only applies when the attribute is synced
                if (descriptor.synced) {
                    target._attributes[key] = descriptor.type || null;
                } else if (descriptor.type) {
                    console.warn('The `type` option is only available for properties using `synced: true`');
                }

                descriptor.configurable = false;
                descriptor.enumerable = true;
                delete descriptor.value;
                delete descriptor.initializer;
                delete descriptor.writable;

                descriptor.get = descriptor.get || function () {
                    var properties = ensureInstanceProperties(this);
                    return properties[key];
                };

                descriptor.set = descriptor.set || function (value) {
                    var properties = ensureInstanceProperties(this);
                    var oldValue = properties[key];
                    properties[key] = value;

                    if (typeof this.propertyChangedCallback === 'function') {
                        this.propertyChangedCallback(key, oldValue, value);
                    }
                };

                if (descriptor.nullable === true) {
                    (function () {
                        var getter = descriptor.get;
                        descriptor.get = function () {
                            return getter.call(this) || null;
                        };
                    })();
                }

                return descriptor;
            });

            _export('property', property);

            nullable = decorator(function (target, key, descriptor) {
                descriptor.nullable = true;
                return descriptor;
            });

            _export('nullable', nullable);

            ui = decorator(function (target, key, descriptor) {
                if (!descriptor.selector) {
                    return console.warn('No \'selector\' option specified for @ui \'' + key + '\'');
                }

                return {
                    get: function get() {
                        return this.querySelector(descriptor.selector);
                    },
                    configurable: false,
                    enumerable: true
                };
            });

            _export('ui', ui);
        }
    };
});
$__System.register('6b', [], function (_export) {
    'use strict';

    _export('restAssembly', restAssembly);

    function restAssembly() {
        var apiParams = { method: "POST", headers: { 'Content-Type': 'application/json' } };
        var REQUEST = undefined;
        var RESPONSE = undefined;
        function buildRequest(params) {
            apiParams.url = params.url ? buildURL(params.url) : apiParams.url;
            apiParams.method = params.payload.method ? params.payload.method : apiParams.method;
            if (apiParams.url.indexOf("stubs") == -1) apiParams.body = buildPayload(params);
            REQUEST = new Request(apiParams.url, apiParams);
        }

        function buildURL(url) {
            return url.indexOf("://") != -1 ? url : window.location.origin + url;
        }

        function buildPayload(params) {
            var data = new FormData();
            for (var item in params.payload) {
                data.append(item, params.body[item]);
            }
            return data;
        }
        function request() {
            return REQUEST;
        }
        function response() {
            return RESPONSE;
        }
        return {
            buildRequest: buildRequest,
            request: request,
            response: response
        };
    }

    return {
        setters: [],
        execute: function () {}
    };
});
$__System.register('17', [], function (_export) {
    'use strict';

    _export('getNestedData', getNestedData);

    _export('sortData', sortData);

    function getNestedData(searchString, object) {
        var value = searchString.split('.').map(function (property, idx) {
            if (typeof object[property] === 'object' && idx < searchString.split('.').length - 1) {
                return getNestedData(searchString.split('.').slice(idx + 1).join("."), object[property]);
            }
            if (typeof object[property] !== 'object' && object[property]) {
                return object[property];
            }
        }).filter(function (data) {
            return data;
        })[0];
        return value;
    }

    function sortData(e, data) {
        data.sort(function (a, b) {
            var current = e.columnName.indexOf('.') != -1 ? getNestedData(e.columnName, a) : a[e.columnName];
            var next = e.columnName.indexOf('.') != -1 ? getNestedData(e.columnName, b) : b[e.columnName];
            var currentValue = !isNaN(parseInt(current)) ? parseInt(current) : current.toLowerCase().replace(/\ /g, "");
            var nextValue = !isNaN(parseInt(next)) ? parseInt(next) : next.toLowerCase().replace(/\ /g, "");
            var reverse = e.sortType === "DESC" ? true : false;
            return (currentValue < nextValue ? -1 : currentValue > nextValue ? 1 : 0) * (reverse ? -1 : 1);
        });
    }

    return {
        setters: [],
        execute: function () {}
    };
});
$__System.register('6c', ['17', '6b'], function (_export) {
    'use strict';

    var getNestedData, sortData, restAssembly;

    _export('VoyaTableServices', VoyaTableServices);

    function VoyaTableServices() {

        var REST = restAssembly();

        function api(params) {
            REST.buildRequest(params);
        }
        function loadData() {
            return fetch(REST.request()).then(function (response) {
                return response.json();
            });
        }
        function sort(e, data) {
            sortData(e, data);
        }
        function filter(e) {}

        return {
            api: api,
            loadData: loadData,
            sort: sort,
            filter: filter
        };
    }

    return {
        setters: [function (_) {
            getNestedData = _.getNestedData;
            sortData = _.sortData;
        }, function (_b) {
            restAssembly = _b.restAssembly;
        }],
        execute: function () {}
    };
});
$__System.register('6d', ['4', '5', '6', '7', '48', '49', 'a', 'b', 'c', '6c'], function (_export) {
	var _defineDecoratedPropertyDescriptor, _createDecoratedClass, _classCallCheck, property, nullable, _Array$slice, VoyaTableTemplate, _get, _inherits, _WeakMap, VoyaTableServices, DATA_EVENT, _privateProperties, VoyaTable;

	return {
		setters: [function (_) {
			_defineDecoratedPropertyDescriptor = _['default'];
		}, function (_2) {
			_createDecoratedClass = _2['default'];
		}, function (_3) {
			_classCallCheck = _3['default'];
		}, function (_6) {
			property = _6.property;
			nullable = _6.nullable;
		}, function (_4) {
			_Array$slice = _4['default'];
		}, function (_5) {
			VoyaTableTemplate = _5.VoyaTableTemplate;
		}, function (_a) {
			_get = _a['default'];
		}, function (_b) {
			_inherits = _b['default'];
		}, function (_c) {
			_WeakMap = _c['default'];
		}, function (_c2) {
			VoyaTableServices = _c2.VoyaTableServices;
		}],
		execute: function () {
			'use strict';

			DATA_EVENT = new CustomEvent('dataAssembled');
			_privateProperties = new _WeakMap();

			VoyaTable = (function (_ref) {
				var _instanceInitializers = {};

				_inherits(VoyaTable, _ref);

				function VoyaTable() {
					_classCallCheck(this, VoyaTable);

					_get(Object.getPrototypeOf(VoyaTable.prototype), 'constructor', this).apply(this, arguments);

					_defineDecoratedPropertyDescriptor(this, 'mobileWidth', _instanceInitializers);

					_defineDecoratedPropertyDescriptor(this, 'data', _instanceInitializers);

					_defineDecoratedPropertyDescriptor(this, 'theme', _instanceInitializers);

					_defineDecoratedPropertyDescriptor(this, 'borders', _instanceInitializers);

					_defineDecoratedPropertyDescriptor(this, 'originalData', _instanceInitializers);

					_defineDecoratedPropertyDescriptor(this, 'columns', _instanceInitializers);

					_defineDecoratedPropertyDescriptor(this, 'rows', _instanceInitializers);

					_defineDecoratedPropertyDescriptor(this, 'template', _instanceInitializers);

					_defineDecoratedPropertyDescriptor(this, 'rowAlternating', _instanceInitializers);

					_defineDecoratedPropertyDescriptor(this, 'sort', _instanceInitializers);

					_defineDecoratedPropertyDescriptor(this, 'filter', _instanceInitializers);

					_defineDecoratedPropertyDescriptor(this, 'apiUrl', _instanceInitializers);

					_defineDecoratedPropertyDescriptor(this, 'apiParams', _instanceInitializers);
				}

				_createDecoratedClass(VoyaTable, [{
					key: 'createdCallback',
					value: function createdCallback() {
						this.template = VoyaTableTemplate();
						this.services = VoyaTableServices();
						this.columns = _Array$slice(this.querySelectorAll("voya-column"));
						var privatePropertyStub = { columnWidth: 100 };
						_privateProperties.set(this, privatePropertyStub);
						this.render();
						this.updateColumns();
						this.addEventListener("dataAssembled", this.buildRows.bind(this));
						this.buildServices();
						this.assembleData();
						if (this.mobileWidth) {
							this.convertToMobile();
							this.windowListener();
						}
					}
				}, {
					key: 'render',
					value: function render() {
						this.innerHTML = this.template.render(this);
					}
				}, {
					key: 'propertyChangedCallback',
					value: function propertyChangedCallback(prop, oldValue, newValue) {
						if (prop === 'sort' || prop === "filter" && oldValue != newValue) this.updateColumns();
					}

					// assembly of child classes
				}, {
					key: 'updateColumns',
					value: function updateColumns() {
						this.columns = this.columns.map((function (col, idx) {
							col.index = idx;
							col.theme = col.theme == null ? this.theme : col.theme;
							col.borders = col.borders == null ? this.borders : col.borders;
							col.width = this.setWidths(col.width);
							col.sort = col.sort == null ? this.sort : col.sort;
							col.filter = col.filter == null ? this.filter : col.filter;
							this.setColumnListeners(col);
							return col;
						}).bind(this));
						var colAmount = this.columns.map(function (col) {
							return !col.width ? col : null;
						}).filter(function (col) {
							return col ? col : null;
						}).length;
						this.columns.forEach((function (col) {
							col.width = !col.width ? this.setColumnFlexWidths(colAmount) : col.width;
						}).bind(this));
						this.template.addColumns(this);
					}
				}, {
					key: 'buildRows',
					value: function buildRows(e) {
						this.rows = this.data.map((function (rec, idx) {
							var row = document.createElement("voya-row");
							row.columns = this.columns;
							row.rowData = rec;
							row.borders = this.borders;
							row.theme = this.theme;
							row.alternate = this.rowAlternating ? idx % 2 === 0 ? "even" : "odd" : null;
							return row;
						}).bind(this));
						this.template.addRows(this);
					}

					// end assembly of child classes

					// behaviors and event handlers
				}, {
					key: 'setColumnListeners',
					value: function setColumnListeners(col) {
						if (col.sort) col.addEventListener("columnSort", (function (e) {
							this.sortData(e);
						}).bind(this), false);
						if (col.filter) col.addEventListener("columnFilter", (function (e) {
							this.filterData(e);
						}).bind(this), false);
					}
				}, {
					key: 'windowListener',
					value: function windowListener() {
						window.addEventListener("resize", (function (e) {
							this.convertToMobile(e);
						}).bind(this));
					}
				}, {
					key: 'setWidths',
					value: function setWidths(width) {
						if (!width) return null;
						_privateProperties.get(this).columnWidth = _privateProperties.get(this).columnWidth - width;
						return width + "%";
					}
				}, {
					key: 'setColumnFlexWidths',
					value: function setColumnFlexWidths(colAmount) {
						return _privateProperties.get(this).columnWidth / colAmount + "%";
					}
				}, {
					key: 'convertToMobile',
					value: function convertToMobile(e) {
						var windowWidth = e ? e.target.outerWidth : window.outerWidth;
						var methodChoice = windowWidth <= this.mobileWidth ? "add" : "remove";
						this.classList[methodChoice]("mobile");
					}

					// end behaviors and event handlers

					//service assembelies and behaviors
				}, {
					key: 'buildServices',
					value: function buildServices() {
						if (!this.apiUrl) return;
						var payload = JSON.parse(this.apiParams);
						var apiParams = { url: this.apiUrl, payload: payload };
						this.services.api(apiParams);
					}
				}, {
					key: 'assembleData',
					value: function assembleData() {
						this.services.loadData().then((function (response) {
							this.originalData = JSON.parse(JSON.stringify(response.records));
							this.data = response.records;
							this.dispatchEvent(DATA_EVENT);
						}).bind(this));
					}
				}, {
					key: 'resetData',
					value: function resetData() {
						return JSON.parse(JSON.stringify(this.originalData));
					}
				}, {
					key: 'sortData',
					value: function sortData(e) {
						this.columns.forEach(function (col) {
							col.removePreviousSorts(e);
						});
						e.columnName = this.rows[0].cells[e.colIndex].cellName != e.columnName ? e.columnName + "." + this.rows[0].cells[e.colIndex].cellName : e.columnName;
						this.services.sort(e, this.data);
						this.data = !e.sortType ? this.resetData() : this.data;
						this.rows = this.data.map((function (rec, idx) {
							this.rows[idx].rowData = rec;
							return this.rows[idx];
						}).bind(this));
					}
				}, {
					key: 'filterData',
					value: function filterData(e) {}

					//end service assembelies and behaviors
				}, {
					key: 'mobileWidth',
					decorators: [nullable, property],
					initializer: null,
					enumerable: true
				}, {
					key: 'data',
					decorators: [nullable, property],
					initializer: null,
					enumerable: true
				}, {
					key: 'theme',
					decorators: [property],
					initializer: null,
					enumerable: true
				}, {
					key: 'borders',
					decorators: [property],
					initializer: null,
					enumerable: true
				}, {
					key: 'originalData',
					decorators: [nullable, property],
					initializer: null,
					enumerable: true
				}, {
					key: 'columns',
					decorators: [nullable, property],
					initializer: null,
					enumerable: true
				}, {
					key: 'rows',
					decorators: [nullable, property],
					initializer: null,
					enumerable: true
				}, {
					key: 'template',
					decorators: [nullable, property],
					initializer: null,
					enumerable: true
				}, {
					key: 'rowAlternating',
					decorators: [nullable, property],
					initializer: null,
					enumerable: true
				}, {
					key: 'sort',
					decorators: [nullable, property({ type: 'boolean' })],
					initializer: function initializer() {
						return null;
					},
					enumerable: true
				}, {
					key: 'filter',
					decorators: [nullable, property({ type: 'boolean' })],
					initializer: function initializer() {
						return null;
					},
					enumerable: true
				}, {
					key: 'apiUrl',
					decorators: [nullable, property({ type: 'string' })],
					initializer: function initializer() {
						return null;
					},
					enumerable: true
				}, {
					key: 'apiParams',
					decorators: [nullable, property],
					initializer: function initializer() {
						return null;
					},
					enumerable: true
				}], null, _instanceInitializers);

				return VoyaTable;
			})(HTMLElement || Element);

			document.registerElement('voya-table', VoyaTable);
		}
	};
});
$__System.register('6e', ['9', '16', 'f', '6d'], function (_export) {
  /* please keep this in specfic order */
  'use strict';

  return {
    setters: [function (_) {}, function (_2) {}, function (_f) {}, function (_d) {}],
    execute: function () {}
  };
});
$__System.registerDynamic("6f", [], true, function($__require, exports, module) {
  "use strict";
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = Delegate;
  function Delegate(root) {
    this.listenerMap = [{}, {}];
    if (root) {
      this.root(root);
    }
    this.handle = Delegate.prototype.handle.bind(this);
  }
  Delegate.prototype.root = function(root) {
    var listenerMap = this.listenerMap;
    var eventType;
    if (this.rootElement) {
      for (eventType in listenerMap[1]) {
        if (listenerMap[1].hasOwnProperty(eventType)) {
          this.rootElement.removeEventListener(eventType, this.handle, true);
        }
      }
      for (eventType in listenerMap[0]) {
        if (listenerMap[0].hasOwnProperty(eventType)) {
          this.rootElement.removeEventListener(eventType, this.handle, false);
        }
      }
    }
    if (!root || !root.addEventListener) {
      if (this.rootElement) {
        delete this.rootElement;
      }
      return this;
    }
    this.rootElement = root;
    for (eventType in listenerMap[1]) {
      if (listenerMap[1].hasOwnProperty(eventType)) {
        this.rootElement.addEventListener(eventType, this.handle, true);
      }
    }
    for (eventType in listenerMap[0]) {
      if (listenerMap[0].hasOwnProperty(eventType)) {
        this.rootElement.addEventListener(eventType, this.handle, false);
      }
    }
    return this;
  };
  Delegate.prototype.captureForType = function(eventType) {
    return ['blur', 'error', 'focus', 'load', 'resize', 'scroll'].indexOf(eventType) !== -1;
  };
  Delegate.prototype.on = function(eventType, selector, handler, useCapture) {
    var root,
        listenerMap,
        matcher,
        matcherParam;
    if (!eventType) {
      throw new TypeError('Invalid event type: ' + eventType);
    }
    if (typeof selector === 'function') {
      useCapture = handler;
      handler = selector;
      selector = null;
    }
    if (useCapture === undefined) {
      useCapture = this.captureForType(eventType);
    }
    if (typeof handler !== 'function') {
      throw new TypeError('Handler must be a type of Function');
    }
    root = this.rootElement;
    listenerMap = this.listenerMap[useCapture ? 1 : 0];
    if (!listenerMap[eventType]) {
      if (root) {
        root.addEventListener(eventType, this.handle, useCapture);
      }
      listenerMap[eventType] = [];
    }
    if (!selector) {
      matcherParam = null;
      matcher = matchesRoot.bind(this);
    } else if (/^[a-z]+$/i.test(selector)) {
      matcherParam = selector;
      matcher = matchesTag;
    } else if (/^#[a-z0-9\-_]+$/i.test(selector)) {
      matcherParam = selector.slice(1);
      matcher = matchesId;
    } else {
      matcherParam = selector;
      matcher = matches;
    }
    listenerMap[eventType].push({
      selector: selector,
      handler: handler,
      matcher: matcher,
      matcherParam: matcherParam
    });
    return this;
  };
  Delegate.prototype.off = function(eventType, selector, handler, useCapture) {
    var i,
        listener,
        listenerMap,
        listenerList,
        singleEventType;
    if (typeof selector === 'function') {
      useCapture = handler;
      handler = selector;
      selector = null;
    }
    if (useCapture === undefined) {
      this.off(eventType, selector, handler, true);
      this.off(eventType, selector, handler, false);
      return this;
    }
    listenerMap = this.listenerMap[useCapture ? 1 : 0];
    if (!eventType) {
      for (singleEventType in listenerMap) {
        if (listenerMap.hasOwnProperty(singleEventType)) {
          this.off(singleEventType, selector, handler);
        }
      }
      return this;
    }
    listenerList = listenerMap[eventType];
    if (!listenerList || !listenerList.length) {
      return this;
    }
    for (i = listenerList.length - 1; i >= 0; i--) {
      listener = listenerList[i];
      if ((!selector || selector === listener.selector) && (!handler || handler === listener.handler)) {
        listenerList.splice(i, 1);
      }
    }
    if (!listenerList.length) {
      delete listenerMap[eventType];
      if (this.rootElement) {
        this.rootElement.removeEventListener(eventType, this.handle, useCapture);
      }
    }
    return this;
  };
  Delegate.prototype.handle = function(event) {
    var i,
        l,
        type = event.type,
        root,
        phase,
        listener,
        returned,
        listenerList = [],
        target,
        EVENTIGNORE = 'ftLabsDelegateIgnore';
    if (event[EVENTIGNORE] === true) {
      return;
    }
    target = event.target;
    if (target.nodeType === 3) {
      target = target.parentNode;
    }
    root = this.rootElement;
    phase = event.eventPhase || (event.target !== event.currentTarget ? 3 : 2);
    switch (phase) {
      case 1:
        listenerList = this.listenerMap[1][type];
        break;
      case 2:
        if (this.listenerMap[0] && this.listenerMap[0][type])
          listenerList = listenerList.concat(this.listenerMap[0][type]);
        if (this.listenerMap[1] && this.listenerMap[1][type])
          listenerList = listenerList.concat(this.listenerMap[1][type]);
        break;
      case 3:
        listenerList = this.listenerMap[0][type];
        break;
    }
    l = listenerList.length;
    while (target && l) {
      for (i = 0; i < l; i++) {
        listener = listenerList[i];
        if (!listener) {
          break;
        }
        if (listener.matcher.call(target, listener.matcherParam, target)) {
          returned = this.fire(event, target, listener);
        }
        if (returned === false) {
          event[EVENTIGNORE] = true;
          event.preventDefault();
          return;
        }
      }
      if (target === root) {
        break;
      }
      l = listenerList.length;
      target = target.parentElement;
    }
  };
  Delegate.prototype.fire = function(event, target, listener) {
    return listener.handler.call(target, event, target);
  };
  var matches = (function(el) {
    if (!el)
      return;
    var p = el.prototype;
    return (p.matches || p.matchesSelector || p.webkitMatchesSelector || p.mozMatchesSelector || p.msMatchesSelector || p.oMatchesSelector);
  }(Element));
  function matchesTag(tagName, element) {
    return tagName.toLowerCase() === element.tagName.toLowerCase();
  }
  function matchesRoot(selector, element) {
    if (this.rootElement === window)
      return element === document;
    return this.rootElement === element;
  }
  function matchesId(id, element) {
    return id === element.id;
  }
  Delegate.prototype.destroy = function() {
    this.off();
    this.root();
  };
  return module.exports;
});

$__System.registerDynamic("70", ["6f"], true, function($__require, exports, module) {
  "use strict";
  ;
  var define,
      global = this,
      GLOBAL = this;
  var Delegate = $__require('6f');
  module.exports = function(root) {
    return new Delegate(root);
  };
  module.exports.Delegate = Delegate;
  return module.exports;
});

$__System.registerDynamic("71", ["70"], true, function($__require, exports, module) {
  ;
  var define,
      global = this,
      GLOBAL = this;
  module.exports = $__require('70');
  return module.exports;
});

$__System.register('1', ['71', 'd', '6e'], function (_export) {
	var delegate, _Object$keys, eventMethod;

	function appLoaded() {
		var menu = document.querySelector('.toolbar');
		var voyaTable = document.querySelector('voya-table');

		delegate(menu).on('click', "li", function (e) {
			console.log('this menu is here and ready for voya-table to be  leveraged to display features to devs');
		});
	}
	return {
		setters: [function (_) {
			delegate = _['default'];
		}, function (_d) {
			_Object$keys = _d['default'];
		}, function (_e) {}],
		execute: function () {
			'use strict';

			eventMethod = addEventListener ? { addEventListener: "DOMContentLoaded" } : { attachEvent: "onload" };

			window[_Object$keys(eventMethod)[0]](eventMethod[_Object$keys(eventMethod)[0]], appLoaded);
		}
	};
});
})
(function(factory) {
  factory();
});
//# sourceMappingURL=demo-built.js.map