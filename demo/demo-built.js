"format global";
(function(global) {

  var defined = {};

  // indexOf polyfill for IE8
  var indexOf = Array.prototype.indexOf || function(item) {
    for (var i = 0, l = this.length; i < l; i++)
      if (this[i] === item)
        return i;
    return -1;
  }

  var getOwnPropertyDescriptor = true;
  try {
    Object.getOwnPropertyDescriptor({ a: 0 }, 'a');
  }
  catch(e) {
    getOwnPropertyDescriptor = false;
  }

  var defineProperty;
  (function () {
    try {
      if (!!Object.defineProperty({}, 'a', {}))
        defineProperty = Object.defineProperty;
    }
    catch (e) {
      defineProperty = function(obj, prop, opt) {
        try {
          obj[prop] = opt.value || opt.get.call(obj);
        }
        catch(e) {}
      }
    }
  })();

  function register(name, deps, declare) {
    if (arguments.length === 4)
      return registerDynamic.apply(this, arguments);
    doRegister(name, {
      declarative: true,
      deps: deps,
      declare: declare
    });
  }

  function registerDynamic(name, deps, executingRequire, execute) {
    doRegister(name, {
      declarative: false,
      deps: deps,
      executingRequire: executingRequire,
      execute: execute
    });
  }

  function doRegister(name, entry) {
    entry.name = name;

    // we never overwrite an existing define
    if (!(name in defined))
      defined[name] = entry;

    // we have to normalize dependencies
    // (assume dependencies are normalized for now)
    // entry.normalizedDeps = entry.deps.map(normalize);
    entry.normalizedDeps = entry.deps;
  }


  function buildGroups(entry, groups) {
    groups[entry.groupIndex] = groups[entry.groupIndex] || [];

    if (indexOf.call(groups[entry.groupIndex], entry) != -1)
      return;

    groups[entry.groupIndex].push(entry);

    for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
      var depName = entry.normalizedDeps[i];
      var depEntry = defined[depName];

      // not in the registry means already linked / ES6
      if (!depEntry || depEntry.evaluated)
        continue;

      // now we know the entry is in our unlinked linkage group
      var depGroupIndex = entry.groupIndex + (depEntry.declarative != entry.declarative);

      // the group index of an entry is always the maximum
      if (depEntry.groupIndex === undefined || depEntry.groupIndex < depGroupIndex) {

        // if already in a group, remove from the old group
        if (depEntry.groupIndex !== undefined) {
          groups[depEntry.groupIndex].splice(indexOf.call(groups[depEntry.groupIndex], depEntry), 1);

          // if the old group is empty, then we have a mixed depndency cycle
          if (groups[depEntry.groupIndex].length == 0)
            throw new TypeError("Mixed dependency cycle detected");
        }

        depEntry.groupIndex = depGroupIndex;
      }

      buildGroups(depEntry, groups);
    }
  }

  function link(name) {
    var startEntry = defined[name];

    startEntry.groupIndex = 0;

    var groups = [];

    buildGroups(startEntry, groups);

    var curGroupDeclarative = !!startEntry.declarative == groups.length % 2;
    for (var i = groups.length - 1; i >= 0; i--) {
      var group = groups[i];
      for (var j = 0; j < group.length; j++) {
        var entry = group[j];

        // link each group
        if (curGroupDeclarative)
          linkDeclarativeModule(entry);
        else
          linkDynamicModule(entry);
      }
      curGroupDeclarative = !curGroupDeclarative; 
    }
  }

  // module binding records
  var moduleRecords = {};
  function getOrCreateModuleRecord(name) {
    return moduleRecords[name] || (moduleRecords[name] = {
      name: name,
      dependencies: [],
      exports: {}, // start from an empty module and extend
      importers: []
    })
  }

  function linkDeclarativeModule(entry) {
    // only link if already not already started linking (stops at circular)
    if (entry.module)
      return;

    var module = entry.module = getOrCreateModuleRecord(entry.name);
    var exports = entry.module.exports;

    var declaration = entry.declare.call(global, function(name, value) {
      module.locked = true;

      if (typeof name == 'object') {
        for (var p in name)
          exports[p] = name[p];
      }
      else {
        exports[name] = value;
      }

      for (var i = 0, l = module.importers.length; i < l; i++) {
        var importerModule = module.importers[i];
        if (!importerModule.locked) {
          for (var j = 0; j < importerModule.dependencies.length; ++j) {
            if (importerModule.dependencies[j] === module) {
              importerModule.setters[j](exports);
            }
          }
        }
      }

      module.locked = false;
      return value;
    });

    module.setters = declaration.setters;
    module.execute = declaration.execute;

    // now link all the module dependencies
    for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
      var depName = entry.normalizedDeps[i];
      var depEntry = defined[depName];
      var depModule = moduleRecords[depName];

      // work out how to set depExports based on scenarios...
      var depExports;

      if (depModule) {
        depExports = depModule.exports;
      }
      else if (depEntry && !depEntry.declarative) {
        depExports = depEntry.esModule;
      }
      // in the module registry
      else if (!depEntry) {
        depExports = load(depName);
      }
      // we have an entry -> link
      else {
        linkDeclarativeModule(depEntry);
        depModule = depEntry.module;
        depExports = depModule.exports;
      }

      // only declarative modules have dynamic bindings
      if (depModule && depModule.importers) {
        depModule.importers.push(module);
        module.dependencies.push(depModule);
      }
      else
        module.dependencies.push(null);

      // run the setter for this dependency
      if (module.setters[i])
        module.setters[i](depExports);
    }
  }

  // An analog to loader.get covering execution of all three layers (real declarative, simulated declarative, simulated dynamic)
  function getModule(name) {
    var exports;
    var entry = defined[name];

    if (!entry) {
      exports = load(name);
      if (!exports)
        throw new Error("Unable to load dependency " + name + ".");
    }

    else {
      if (entry.declarative)
        ensureEvaluated(name, []);

      else if (!entry.evaluated)
        linkDynamicModule(entry);

      exports = entry.module.exports;
    }

    if ((!entry || entry.declarative) && exports && exports.__useDefault)
      return exports['default'];

    return exports;
  }

  function linkDynamicModule(entry) {
    if (entry.module)
      return;

    var exports = {};

    var module = entry.module = { exports: exports, id: entry.name };

    // AMD requires execute the tree first
    if (!entry.executingRequire) {
      for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
        var depName = entry.normalizedDeps[i];
        var depEntry = defined[depName];
        if (depEntry)
          linkDynamicModule(depEntry);
      }
    }

    // now execute
    entry.evaluated = true;
    var output = entry.execute.call(global, function(name) {
      for (var i = 0, l = entry.deps.length; i < l; i++) {
        if (entry.deps[i] != name)
          continue;
        return getModule(entry.normalizedDeps[i]);
      }
      throw new TypeError('Module ' + name + ' not declared as a dependency.');
    }, exports, module);

    if (output)
      module.exports = output;

    // create the esModule object, which allows ES6 named imports of dynamics
    exports = module.exports;
 
    if (exports && exports.__esModule) {
      entry.esModule = exports;
    }
    else {
      entry.esModule = {};
      
      // don't trigger getters/setters in environments that support them
      if ((typeof exports == 'object' || typeof exports == 'function') && exports !== global) {
        if (getOwnPropertyDescriptor) {
          var d;
          for (var p in exports)
            if (d = Object.getOwnPropertyDescriptor(exports, p))
              defineProperty(entry.esModule, p, d);
        }
        else {
          var hasOwnProperty = exports && exports.hasOwnProperty;
          for (var p in exports) {
            if (!hasOwnProperty || exports.hasOwnProperty(p))
              entry.esModule[p] = exports[p];
          }
         }
       }
      entry.esModule['default'] = exports;
      defineProperty(entry.esModule, '__useDefault', {
        value: true
      });
    }
  }

  /*
   * Given a module, and the list of modules for this current branch,
   *  ensure that each of the dependencies of this module is evaluated
   *  (unless one is a circular dependency already in the list of seen
   *  modules, in which case we execute it)
   *
   * Then we evaluate the module itself depth-first left to right 
   * execution to match ES6 modules
   */
  function ensureEvaluated(moduleName, seen) {
    var entry = defined[moduleName];

    // if already seen, that means it's an already-evaluated non circular dependency
    if (!entry || entry.evaluated || !entry.declarative)
      return;

    // this only applies to declarative modules which late-execute

    seen.push(moduleName);

    for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
      var depName = entry.normalizedDeps[i];
      if (indexOf.call(seen, depName) == -1) {
        if (!defined[depName])
          load(depName);
        else
          ensureEvaluated(depName, seen);
      }
    }

    if (entry.evaluated)
      return;

    entry.evaluated = true;
    entry.module.execute.call(global);
  }

  // magical execution function
  var modules = {};
  function load(name) {
    if (modules[name])
      return modules[name];

    // node core modules
    if (name.substr(0, 6) == '@node/')
      return require(name.substr(6));

    var entry = defined[name];

    // first we check if this module has already been defined in the registry
    if (!entry)
      throw "Module " + name + " not present.";

    // recursively ensure that the module and all its 
    // dependencies are linked (with dependency group handling)
    link(name);

    // now handle dependency execution in correct order
    ensureEvaluated(name, []);

    // remove from the registry
    defined[name] = undefined;

    // exported modules get __esModule defined for interop
    if (entry.declarative)
      defineProperty(entry.module.exports, '__esModule', { value: true });

    // return the defined module object
    return modules[name] = entry.declarative ? entry.module.exports : entry.esModule;
  };

  return function(mains, depNames, declare) {
    return function(formatDetect) {
      formatDetect(function(deps) {
        var System = {
          _nodeRequire: typeof require != 'undefined' && require.resolve && typeof process != 'undefined' && require,
          register: register,
          registerDynamic: registerDynamic,
          get: load, 
          set: function(name, module) {
            modules[name] = module; 
          },
          newModule: function(module) {
            return module;
          }
        };
        System.set('@empty', {});

        // register external dependencies
        for (var i = 0; i < depNames.length; i++) (function(depName, dep) {
          if (dep && dep.__esModule)
            System.register(depName, [], function(_export) {
              return {
                setters: [],
                execute: function() {
                  for (var p in dep)
                    if (p != '__esModule' && !(typeof p == 'object' && p + '' == 'Module'))
                      _export(p, dep[p]);
                }
              };
            });
          else
            System.registerDynamic(depName, [], false, function() {
              return dep;
            });
        })(depNames[i], arguments[i]);

        // register modules in this bundle
        declare(System);

        // load mains
        var firstLoad = load(mains[0]);
        if (mains.length > 1)
          for (var i = 1; i < mains.length; i++)
            load(mains[i]);

        if (firstLoad.__useDefault)
          return firstLoad['default'];
        else
          return firstLoad;
      });
    };
  };

})(typeof self != 'undefined' ? self : global)
/* (['mainModule'], ['external-dep'], function($__System) {
  System.register(...);
})
(function(factory) {
  if (typeof define && define.amd)
    define(['external-dep'], factory);
  // etc UMD / module pattern
})*/

(['1'], [], function($__System) {

$__System.registerDynamic("2", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
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
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("3", ["2"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var Delegate = req('2');
  module.exports = function(root) {
    return new Delegate(root);
  };
  module.exports.Delegate = Delegate;
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("4", ["3"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = req('3');
  global.define = __define;
  return module.exports;
});

$__System.register('5', [], function (_export) {
    'use strict';

    _export('restAssembly', restAssembly);

    function restAssembly() {
        var apiParams = { method: "POST", headers: { 'Content-Type': 'application/json' } };
        var REQUEST = undefined;
        var RESPONSE = undefined;
        function buildRequest(params) {
            apiParams.url = params.url ? params.url : apiParams.url;
            apiParams.method = params.payload.method ? params.payload.method : apiParams.method;
            if (apiParams.url.indexOf("stubs") == -1) apiParams.body = buildPayload(params);
            REQUEST = new Request(apiParams.url, apiParams);
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
$__System.register('6', ['5', '7'], function (_export) {
    'use strict';

    var restAssembly, getNestedData, sortData;

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
            restAssembly = _.restAssembly;
        }, function (_2) {
            getNestedData = _2.getNestedData;
            sortData = _2.sortData;
        }],
        execute: function () {}
    };
});
$__System.register("8", [], function (_export) {
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
$__System.registerDynamic("9", ["a", "b", "c", "d"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = req('a'),
      $export = req('b'),
      $ctx = req('c'),
      $Array = req('d').Array || Array,
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
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("e", ["9", "d"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  req('9');
  module.exports = req('d').Array.slice;
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("f", ["e"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": req('e'),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

$__System.register('10', ['6', '8', '11', '12', '13', '14', '15', '16', 'f'], function (_export) {
	var VoyaTableServices, VoyaTableTemplate, _get, _inherits, _defineDecoratedPropertyDescriptor, _createDecoratedClass, _classCallCheck, property, nullable, _Array$slice, DATA_EVENT, VoyaTable;

	return {
		setters: [function (_8) {
			VoyaTableServices = _8.VoyaTableServices;
		}, function (_6) {
			VoyaTableTemplate = _6.VoyaTableTemplate;
		}, function (_) {
			_get = _['default'];
		}, function (_2) {
			_inherits = _2['default'];
		}, function (_3) {
			_defineDecoratedPropertyDescriptor = _3['default'];
		}, function (_4) {
			_createDecoratedClass = _4['default'];
		}, function (_5) {
			_classCallCheck = _5['default'];
		}, function (_7) {
			property = _7.property;
			nullable = _7.nullable;
		}, function (_f) {
			_Array$slice = _f['default'];
		}],
		execute: function () {
			'use strict';

			DATA_EVENT = new CustomEvent('dataAssembled');

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
						this.tableWidth = 100;
						this.template = VoyaTableTemplate();
						this.services = VoyaTableServices();
						this.columns = _Array$slice(this.querySelectorAll("voya-column"));
						this.render();
						this.addEventListener("dataAssembled", this.buildColsAndRows.bind(this));
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
					value: function propertyChangedCallback(prop, oldValue, newValue) {}

					// assembly of child classes
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
					// end assembly of child classes
				}, {
					key: 'buildColsAndRows',
					value: function buildColsAndRows(e) {
						this.updateColumns();
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
				}, {
					key: 'updateColumns',
					value: function updateColumns() {
						var colAmount = this.columns.map(function (col) {
							return !col.width ? col : null;
						}).filter(function (col) {
							return col ? col : null;
						}).length,
						    flexWidth = 100;
						this.columns.map(function (col) {
							return col.width ? parseInt(col.width) : null;
						}).filter(function (width) {
							return width ? parseInt(width) : null;
						}).forEach(function (width) {
							flexWidth = flexWidth - width;
						});
						this.columns = this.columns.map((function (col, idx) {
							col.colAmount = colAmount;
							col.flexWidth = flexWidth;
							col.index = idx;
							col.theme = col.theme == null ? this.theme : col.theme;
							col.borders = col.borders == null ? this.borders : col.borders;
							col.sort = col.sort == null ? this.sort : col.sort;
							col.filter = col.filter == null ? this.filter : col.filter;
							this.setColumnListeners(col);
							return col;
						}).bind(this));
						this.template.addColumns(this);
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
					key: 'convertToMobile',
					value: function convertToMobile(e) {
						var windowWidth = e ? e.target.outerWidth : window.outerWidth;
						var methodChoice = windowWidth <= this.mobileWidth ? "add" : "remove";
						this.classList[methodChoice]("mobile");
					}

					// end behaviors and event handlers
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
$__System.register('7', [], function (_export) {
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
$__System.register("17", [], function (_export) {
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
$__System.register('18', ['7', '11', '12', '13', '14', '15', '16', '17', '19'], function (_export) {
    var getNestedData, _get, _inherits, _defineDecoratedPropertyDescriptor, _createDecoratedClass, _classCallCheck, property, nullable, VoyaCellTemplate, _Object$keys, VoyaCell;

    return {
        setters: [function (_9) {
            getNestedData = _9.getNestedData;
        }, function (_) {
            _get = _['default'];
        }, function (_2) {
            _inherits = _2['default'];
        }, function (_3) {
            _defineDecoratedPropertyDescriptor = _3['default'];
        }, function (_4) {
            _createDecoratedClass = _4['default'];
        }, function (_5) {
            _classCallCheck = _5['default'];
        }, function (_8) {
            property = _8.property;
            nullable = _8.nullable;
        }, function (_7) {
            VoyaCellTemplate = _7.VoyaCellTemplate;
        }, function (_6) {
            _Object$keys = _6['default'];
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
$__System.register("1a", [], function (_export) {
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
$__System.register('1b', ['11', '12', '13', '14', '15', '16', '1a'], function (_export) {
    var _get, _inherits, _defineDecoratedPropertyDescriptor, _createDecoratedClass, _classCallCheck, property, nullable, VoyaRowTemplate, VoyaRow;

    return {
        setters: [function (_) {
            _get = _['default'];
        }, function (_2) {
            _inherits = _2['default'];
        }, function (_3) {
            _defineDecoratedPropertyDescriptor = _3['default'];
        }, function (_4) {
            _createDecoratedClass = _4['default'];
        }, function (_5) {
            _classCallCheck = _5['default'];
        }, function (_6) {
            property = _6.property;
            nullable = _6.nullable;
        }, function (_a) {
            VoyaRowTemplate = _a.VoyaRowTemplate;
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
$__System.register('1c', ['13', '14', '15', '16'], function (_export) {
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
$__System.register("1d", ["13", "14", "15", "16"], function (_export) {
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
$__System.register('1e', ['1f'], function (_export) {
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
        setters: [function (_f) {
            _Object$assign = _f['default'];
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
$__System.registerDynamic("20", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
  module.exports = function(str, sep) {
    if (typeof str !== 'string') {
      throw new TypeError('Expected a string');
    }
    sep = typeof sep === 'undefined' ? '_' : sep;
    return str.replace(/([a-z\d])([A-Z])/g, '$1' + sep + '$2').replace(/([A-Z]+)([A-Z][a-z\d]+)/g, '$1' + sep + '$2').toLowerCase();
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("21", ["20"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = req('20');
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("22", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
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
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("23", ["22"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = req('22');
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("24", ["a", "25"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = req('a'),
      toIObject = req('25'),
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
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("26", ["b", "24"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $export = req('b'),
      $entries = req('24')(true);
  $export($export.S, 'Object', {entries: function entries(it) {
      return $entries(it);
    }});
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("27", ["26", "d"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  req('26');
  module.exports = req('d').Object.entries;
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("28", ["27"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": req('27'),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("29", ["a", "2a", "2b", "2c"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = req('a'),
      toObject = req('2a'),
      IObject = req('2b');
  module.exports = req('2c')(function() {
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
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("2d", ["b", "29"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $export = req('b');
  $export($export.S + $export.F, 'Object', {assign: req('29')});
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("2e", ["2d", "d"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  req('2d');
  module.exports = req('d').Object.assign;
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("1f", ["2e"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": req('2e'),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("2f", ["30", "31", "32", "d"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var classof = req('30'),
      ITERATOR = req('31')('iterator'),
      Iterators = req('32');
  module.exports = req('d').isIterable = function(it) {
    var O = Object(it);
    return O[ITERATOR] !== undefined || '@@iterator' in O || Iterators.hasOwnProperty(classof(O));
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("33", ["34", "35", "2f"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  req('34');
  req('35');
  module.exports = req('2f');
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("36", ["33"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": req('33'),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("37", ["38", "39", "d"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var anObject = req('38'),
      get = req('39');
  module.exports = req('d').getIterator = function(it) {
    var iterFn = get(it);
    if (typeof iterFn != 'function')
      throw TypeError(it + ' is not iterable!');
    return anObject(iterFn.call(it));
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("3a", ["3b", "3c"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var toInteger = req('3b'),
      defined = req('3c');
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
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("35", ["3a", "3d"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var $at = req('3a')(true);
  req('3d')(String, 'String', function(iterated) {
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
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("3e", ["34", "35", "37"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  req('34');
  req('35');
  module.exports = req('37');
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("3f", ["3e"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": req('3e'),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("40", ["3f", "36"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var _getIterator = req('3f')["default"];
  var _isIterable = req('36')["default"];
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
  global.define = __define;
  return module.exports;
});

$__System.register('16', ['21', '23', '28', '40', '1f', '3f', '1e'], function (_export) {
    var decamelize, camelcase, _Object$entries, _slicedToArray, _Object$assign, _getIterator, decorator, coerce, property, nullable, ui;

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
        setters: [function (_4) {
            decamelize = _4['default'];
        }, function (_3) {
            camelcase = _3['default'];
        }, function (_2) {
            _Object$entries = _2['default'];
        }, function (_) {
            _slicedToArray = _['default'];
        }, function (_f) {
            _Object$assign = _f['default'];
        }, function (_f2) {
            _getIterator = _f2['default'];
        }, function (_e) {
            decorator = _e.decorator;
            coerce = _e.coerce;
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
$__System.register("41", [], function (_export) {
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
            if (!el.width) return;
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
$__System.registerDynamic("42", ["a", "43", "b", "2c", "44", "45", "46", "47", "48", "49", "4a"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var $ = req('a'),
      global = req('43'),
      $export = req('b'),
      fails = req('2c'),
      hide = req('44'),
      redefineAll = req('45'),
      forOf = req('46'),
      strictNew = req('47'),
      isObject = req('48'),
      setToStringTag = req('49'),
      DESCRIPTORS = req('4a');
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
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("4b", ["4c"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var cof = req('4c');
  module.exports = Array.isArray || function(arg) {
    return cof(arg) == 'Array';
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("4d", ["48", "4b", "31"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var isObject = req('48'),
      isArray = req('4b'),
      SPECIES = req('31')('species');
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
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("4e", ["c", "2b", "2a", "4f", "4d"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var ctx = req('c'),
      IObject = req('2b'),
      toObject = req('2a'),
      toLength = req('4f'),
      asc = req('4d');
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
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("30", ["4c", "31"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var cof = req('4c'),
      TAG = req('31')('toStringTag'),
      ARG = cof(function() {
        return arguments;
      }()) == 'Arguments';
  module.exports = function(it) {
    var O,
        T,
        B;
    return it === undefined ? 'Undefined' : it === null ? 'Null' : typeof(T = (O = Object(it))[TAG]) == 'string' ? T : ARG ? cof(O) : (B = cof(O)) == 'Object' && typeof O.callee == 'function' ? 'Arguments' : B;
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("39", ["30", "31", "32", "d"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var classof = req('30'),
      ITERATOR = req('31')('iterator'),
      Iterators = req('32');
  module.exports = req('d').getIteratorMethod = function(it) {
    if (it != undefined)
      return it[ITERATOR] || it['@@iterator'] || Iterators[classof(it)];
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("3b", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var ceil = Math.ceil,
      floor = Math.floor;
  module.exports = function(it) {
    return isNaN(it = +it) ? 0 : (it > 0 ? floor : ceil)(it);
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("4f", ["3b"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var toInteger = req('3b'),
      min = Math.min;
  module.exports = function(it) {
    return it > 0 ? min(toInteger(it), 0x1fffffffffffff) : 0;
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("50", ["32", "31"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var Iterators = req('32'),
      ITERATOR = req('31')('iterator'),
      ArrayProto = Array.prototype;
  module.exports = function(it) {
    return it !== undefined && (Iterators.Array === it || ArrayProto[ITERATOR] === it);
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("51", ["38"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var anObject = req('38');
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
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("46", ["c", "51", "50", "38", "4f", "39"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var ctx = req('c'),
      call = req('51'),
      isArrayIter = req('50'),
      anObject = req('38'),
      toLength = req('4f'),
      getIterFn = req('39');
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
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("47", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = function(it, Constructor, name) {
    if (!(it instanceof Constructor))
      throw TypeError(name + ": use the 'new' operator!");
    return it;
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("45", ["52"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var redefine = req('52');
  module.exports = function(target, src) {
    for (var key in src)
      redefine(target, key, src[key]);
    return target;
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("53", ["44", "45", "38", "48", "47", "46", "4e", "54", "55"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var hide = req('44'),
      redefineAll = req('45'),
      anObject = req('38'),
      isObject = req('48'),
      strictNew = req('47'),
      forOf = req('46'),
      createArrayMethod = req('4e'),
      $has = req('54'),
      WEAK = req('55')('weak'),
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
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("56", ["a", "52", "53", "48", "54", "42"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var $ = req('a'),
      redefine = req('52'),
      weak = req('53'),
      isObject = req('48'),
      has = req('54'),
      frozenStore = weak.frozenStore,
      WEAK = weak.WEAK,
      isExtensible = Object.isExtensible || isObject,
      tmp = {};
  var $WeakMap = req('42')('WeakMap', function(get) {
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
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("55", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var id = 0,
      px = Math.random();
  module.exports = function(key) {
    return 'Symbol('.concat(key === undefined ? '' : key, ')_', (++id + px).toString(36));
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("57", ["43"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var global = req('43'),
      SHARED = '__core-js_shared__',
      store = global[SHARED] || (global[SHARED] = {});
  module.exports = function(key) {
    return store[key] || (store[key] = {});
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("31", ["57", "55", "43"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var store = req('57')('wks'),
      uid = req('55'),
      Symbol = req('43').Symbol;
  module.exports = function(name) {
    return store[name] || (store[name] = Symbol && Symbol[name] || (Symbol || uid)('Symbol.' + name));
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("49", ["a", "54", "31"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var def = req('a').setDesc,
      has = req('54'),
      TAG = req('31')('toStringTag');
  module.exports = function(it, tag, stat) {
    if (it && !has(it = stat ? it : it.prototype, TAG))
      def(it, TAG, {
        configurable: true,
        value: tag
      });
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("58", ["a", "59", "49", "44", "31"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var $ = req('a'),
      descriptor = req('59'),
      setToStringTag = req('49'),
      IteratorPrototype = {};
  req('44')(IteratorPrototype, req('31')('iterator'), function() {
    return this;
  });
  module.exports = function(Constructor, NAME, next) {
    Constructor.prototype = $.create(IteratorPrototype, {next: descriptor(1, next)});
    setToStringTag(Constructor, NAME + ' Iterator');
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("54", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var hasOwnProperty = {}.hasOwnProperty;
  module.exports = function(it, key) {
    return hasOwnProperty.call(it, key);
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("4a", ["2c"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = !req('2c')(function() {
    return Object.defineProperty({}, 'a', {get: function() {
        return 7;
      }}).a != 7;
  });
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("59", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = function(bitmap, value) {
    return {
      enumerable: !(bitmap & 1),
      configurable: !(bitmap & 2),
      writable: !(bitmap & 4),
      value: value
    };
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("44", ["a", "59", "4a"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = req('a'),
      createDesc = req('59');
  module.exports = req('4a') ? function(object, key, value) {
    return $.setDesc(object, key, createDesc(1, value));
  } : function(object, key, value) {
    object[key] = value;
    return object;
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("52", ["44"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = req('44');
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("5a", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = true;
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("3d", ["5a", "b", "52", "44", "54", "32", "58", "49", "a", "31"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var LIBRARY = req('5a'),
      $export = req('b'),
      redefine = req('52'),
      hide = req('44'),
      has = req('54'),
      Iterators = req('32'),
      $iterCreate = req('58'),
      setToStringTag = req('49'),
      getProto = req('a').getProto,
      ITERATOR = req('31')('iterator'),
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
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("32", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {};
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("5b", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = function(done, value) {
    return {
      value: value,
      done: !!done
    };
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("5c", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = function() {};
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("5d", ["5c", "5b", "32", "25", "3d"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var addToUnscopables = req('5c'),
      step = req('5b'),
      Iterators = req('32'),
      toIObject = req('25');
  module.exports = req('3d')(Array, 'Array', function(iterated, kind) {
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
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("34", ["5d", "32"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  req('5d');
  var Iterators = req('32');
  Iterators.NodeList = Iterators.HTMLCollection = Iterators.Array;
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("5e", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  "format cjs";
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("5f", ["5e", "34", "56", "d"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  req('5e');
  req('34');
  req('56');
  module.exports = req('d').WeakMap;
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("60", ["5f"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": req('5f'),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("15", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  "use strict";
  exports["default"] = function(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };
  exports.__esModule = true;
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("14", ["61"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var _Object$defineProperty = req('61')["default"];
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
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("62", ["a"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = req('a');
  module.exports = function defineProperty(it, key, desc) {
    return $.setDesc(it, key, desc);
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("61", ["62"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": req('62'),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("13", ["61"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var _Object$defineProperty = req('61')["default"];
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
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("38", ["48"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var isObject = req('48');
  module.exports = function(it) {
    if (!isObject(it))
      throw TypeError(it + ' is not an object!');
    return it;
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("48", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = function(it) {
    return typeof it === 'object' ? it !== null : typeof it === 'function';
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("63", ["a", "48", "38", "c"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var getDesc = req('a').getDesc,
      isObject = req('48'),
      anObject = req('38');
  var check = function(O, proto) {
    anObject(O);
    if (!isObject(proto) && proto !== null)
      throw TypeError(proto + ": can't set as prototype!");
  };
  module.exports = {
    set: Object.setPrototypeOf || ('__proto__' in {} ? function(test, buggy, set) {
      try {
        set = req('c')(Function.call, getDesc(Object.prototype, '__proto__').set, 2);
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
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("64", ["b", "63"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $export = req('b');
  $export($export.S, 'Object', {setPrototypeOf: req('63').set});
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("65", ["64", "d"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  req('64');
  module.exports = req('d').Object.setPrototypeOf;
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("66", ["65"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": req('65'),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("67", ["a"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = req('a');
  module.exports = function create(P, D) {
    return $.create(P, D);
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("68", ["67"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": req('67'),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("12", ["68", "66"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var _Object$create = req('68')["default"];
  var _Object$setPrototypeOf = req('66')["default"];
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
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("4c", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var toString = {}.toString;
  module.exports = function(it) {
    return toString.call(it).slice(8, -1);
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("2b", ["4c"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var cof = req('4c');
  module.exports = Object('z').propertyIsEnumerable(0) ? Object : function(it) {
    return cof(it) == 'String' ? it.split('') : Object(it);
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("25", ["2b", "3c"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var IObject = req('2b'),
      defined = req('3c');
  module.exports = function(it) {
    return IObject(defined(it));
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("69", ["25", "6a"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var toIObject = req('25');
  req('6a')('getOwnPropertyDescriptor', function($getOwnPropertyDescriptor) {
    return function getOwnPropertyDescriptor(it, key) {
      return $getOwnPropertyDescriptor(toIObject(it), key);
    };
  });
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("a", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
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
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("6b", ["a", "69"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = req('a');
  req('69');
  module.exports = function getOwnPropertyDescriptor(it, key) {
    return $.getDesc(it, key);
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("6c", ["6b"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": req('6b'),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("11", ["6c"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var _Object$getOwnPropertyDescriptor = req('6c')["default"];
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
  global.define = __define;
  return module.exports;
});

$__System.register('6d', ['11', '12', '13', '14', '15', '16', '19', '41', '60', '1d', '1c'], function (_export) {
    var _get, _inherits, _defineDecoratedPropertyDescriptor, _createDecoratedClass, _classCallCheck, property, nullable, _Object$keys, VoyaColumnTemplate, _WeakMap, Sort, Filter, _features, _privateProperties, VoyaColumn;

    return {
        setters: [function (_) {
            _get = _['default'];
        }, function (_2) {
            _inherits = _2['default'];
        }, function (_3) {
            _defineDecoratedPropertyDescriptor = _3['default'];
        }, function (_4) {
            _createDecoratedClass = _4['default'];
        }, function (_5) {
            _classCallCheck = _5['default'];
        }, function (_9) {
            property = _9.property;
            nullable = _9.nullable;
        }, function (_7) {
            _Object$keys = _7['default'];
        }, function (_8) {
            VoyaColumnTemplate = _8.VoyaColumnTemplate;
        }, function (_6) {
            _WeakMap = _6['default'];
        }, function (_d) {
            Sort = _d.Sort;
        }, function (_c) {
            Filter = _c.Filter;
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

                    _defineDecoratedPropertyDescriptor(this, 'colAmount', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'flexWidth', _instanceInitializers);

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
                        _privateProperties.set(this, _features);
                        this.template = VoyaColumnTemplate();
                        this.name = !this.name ? this.innerHTML : this.name;
                        this.width = this.width ? this.setWidth() : null;
                        this.render();
                        this.assembleFeatures();
                    }
                }, {
                    key: 'render',
                    value: function render() {
                        this.innerHTML = this.template.render(this);
                        if (this.theme || this.borders) this.template.updateTheme(this);
                        if (this.width) this.template.updateColumnWidth(this);
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
                            if ((prop == "colAmount" || prop == "flexWidth") && !this.width) {
                                this.width = this.setColumnFlexWidth();
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
                    key: 'setWidth',
                    value: function setWidth() {
                        if (!this.width) return null;
                        return this.width + "%";
                    }
                }, {
                    key: 'setColumnFlexWidth',
                    value: function setColumnFlexWidth() {
                        if (!this.flexWidth || !this.colAmount) return;
                        return this.flexWidth / this.colAmount + "%";
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
                    key: 'colAmount',
                    decorators: [property],
                    initializer: null,
                    enumerable: true
                }, {
                    key: 'flexWidth',
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
$__System.register('6e', ['10', '18', '6d', '1b'], function (_export) {
  /* please keep this in specfic order */
  'use strict';

  return {
    setters: [function (_2) {}, function (_) {}, function (_d) {}, function (_b) {}],
    execute: function () {}
  };
});
$__System.registerDynamic("2c", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = function(exec) {
    try {
      return !!exec();
    } catch (e) {
      return true;
    }
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("6f", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = function(it) {
    if (typeof it != 'function')
      throw TypeError(it + ' is not a function!');
    return it;
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("c", ["6f"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var aFunction = req('6f');
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
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("d", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var core = module.exports = {version: '1.2.6'};
  if (typeof __e == 'number')
    __e = core;
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("43", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var global = module.exports = typeof window != 'undefined' && window.Math == Math ? window : typeof self != 'undefined' && self.Math == Math ? self : Function('return this')();
  if (typeof __g == 'number')
    __g = global;
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("b", ["43", "d", "c"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var global = req('43'),
      core = req('d'),
      ctx = req('c'),
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
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("6a", ["b", "d", "2c"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $export = req('b'),
      core = req('d'),
      fails = req('2c');
  module.exports = function(KEY, exec) {
    var fn = (core.Object || {})[KEY] || Object[KEY],
        exp = {};
    exp[KEY] = exec(fn);
    $export($export.S + $export.F * fails(function() {
      fn(1);
    }), 'Object', exp);
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("3c", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = function(it) {
    if (it == undefined)
      throw TypeError("Can't call method on  " + it);
    return it;
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("2a", ["3c"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var defined = req('3c');
  module.exports = function(it) {
    return Object(defined(it));
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("70", ["2a", "6a"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var toObject = req('2a');
  req('6a')('keys', function($keys) {
    return function keys(it) {
      return $keys(toObject(it));
    };
  });
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("71", ["70", "d"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  req('70');
  module.exports = req('d').Object.keys;
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("19", ["71"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": req('71'),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

$__System.register('1', ['4', '19', '6e'], function (_export) {
	var delegate, _Object$keys, eventMethod;

	function appLoaded() {
		var menu = document.querySelector('.toolbar');
		var voyaTable = document.querySelector('voya-table');

		delegate(menu).on('click', "li", function (e) {
			console.log('this menu is here and ready for voya-table to be  leveraged to display features to devs');
		});
	}
	return {
		setters: [function (_2) {
			delegate = _2['default'];
		}, function (_) {
			_Object$keys = _['default'];
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