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

$__System.register('5', ['6'], function (_export) {
    var _Object$keys;

    function restAssembly() {
        var apiParams = { method: "POST", headers: { 'Content-Type': 'application/json', 'X-Requested-By': 'myVoya' } };
        var REQUEST = undefined;
        var RESPONSE = undefined;
        function buildRequest(params) {
            apiParams.url = params.url ? params.url : apiParams.url;
            if (params.options) buildOptions(params.options);
            apiParams.method = params.payload && params.payload.method ? params.payload.method : apiParams.method;
            if (apiParams.url.indexOf("stubs") == -1 && apiParams.method.toLowerCase() !== "get" && params.payload) apiParams.body = buildPayload(params);
            REQUEST = new Request(apiParams.url, apiParams);
        }

        function buildOptions(params) {
            _Object$keys(params).forEach(function (property) {
                apiParams[property] = params[property];
            });
        }
        function buildPayload(params) {
            var data = new FormData();
            for (var item in params.payload) {
                data.append(item, params.payload[item]);
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
        setters: [function (_) {
            _Object$keys = _['default'];
        }],
        execute: function () {
            'use strict';

            _export('restAssembly', restAssembly);
        }
    };
});
$__System.register('7', ['5', '8'], function (_export) {
    'use strict';

    var restAssembly, getNestedData, sortData;

    _export('VoyaTableServices', VoyaTableServices);

    function VoyaTableServices() {

        var REST = restAssembly();
        function buildService(cmp) {
            if (!cmp.apiUrl) return;
            var payload = cmp.fetchPayload && typeof cmp.fetchPayload === "string" ? JSON.parse(cmp.fetchPayload) : cmp.fetchPayload;
            var options = cmp.fetchOptions && typeof cmp.fetchOptions === "string" ? JSON.parse(cmp.fetchOptions) : cmp.fetchOptions;
            var apiParams = { url: cmp.apiUrl, payload: payload, options: options };
            api(apiParams);
        }

        function api(params) {
            REST.buildRequest(params);
        }
        function callService() {
            return fetch(REST.request()).then(function (response) {
                return response.json();
            });
        }
        function loadData(cmp) {
            return callService().then(function (response) {
                return cmp.bindingProperty.indexOf(".") != -1 ? parseData(cmp.bindingProperty, response, 0) : response[cmp.bindingProperty];
            });
        }
        function parseData(_x, _x2, _x3) {
            var _again = true;

            _function: while (_again) {
                var bindingProperty = _x,
                    data = _x2,
                    index = _x3;
                _again = false;

                var propArray = bindingProperty.split(".");
                if (typeof data[propArray[index]] === "object" && !Array.isArray(data[propArray[index]])) {
                    _x = bindingProperty;
                    _x2 = data[propArray[index]];
                    _x3 = index + 1;
                    _again = true;
                    propArray = undefined;
                    continue _function;
                } else {
                    return data[propArray[index]];
                }
            }
        }
        function sort(e, data) {
            sortData(e, data);
        }
        function filter(e) {}

        return {
            buildService: buildService,
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
$__System.register("9", [], function (_export) {
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
		function updateTemplateView(el) {
			el.querySelector(".voya-table-rows-wrapper").style.maxHeight = el.scrollHeight + "px";
		}

		return {
			render: render,
			addColumns: addColumns,
			addRows: addRows,
			updateTemplateView: updateTemplateView
		};
	}

	return {
		setters: [],
		execute: function () {}
	};
});
$__System.registerDynamic("a", ["b", "c", "d", "e"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = req('b'),
      $export = req('c'),
      $ctx = req('d'),
      $Array = req('e').Array || Array,
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

$__System.registerDynamic("f", ["a", "e"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  req('a');
  module.exports = req('e').Array.slice;
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("10", ["f"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": req('f'),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

$__System.register('11', ['7', '9', '10', '12', '13', '14', '15', '16', '17'], function (_export) {
	var VoyaTableServices, VoyaTableTemplate, _Array$slice, _get, _inherits, _defineDecoratedPropertyDescriptor, _createDecoratedClass, _classCallCheck, property, nullable, VoyaTable;

	return {
		setters: [function (_9) {
			VoyaTableServices = _9.VoyaTableServices;
		}, function (_7) {
			VoyaTableTemplate = _7.VoyaTableTemplate;
		}, function (_6) {
			_Array$slice = _6['default'];
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
		}],
		execute: function () {
			'use strict';

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

					_defineDecoratedPropertyDescriptor(this, 'fetchOptions', _instanceInitializers);

					_defineDecoratedPropertyDescriptor(this, 'fetchPayload', _instanceInitializers);

					_defineDecoratedPropertyDescriptor(this, 'bindingProperty', _instanceInitializers);

					_defineDecoratedPropertyDescriptor(this, 'scrollHeight', _instanceInitializers);
				}

				_createDecoratedClass(VoyaTable, [{
					key: 'createdCallback',
					value: function createdCallback() {
						this.tableWidth = 100;
						this.template = VoyaTableTemplate();
						this.services = VoyaTableServices();
						this.columns = _Array$slice(this.querySelectorAll("voya-column"));
						this.render();
						this.addEventListener("columnWidth", this.updateWidths.bind(this));
						if (this.mobileWidth) {
							this.updateMobileView();
						}
						if (!this.apiUrl) return;
						this.fetchData();
					}
				}, {
					key: 'render',
					value: function render() {
						this.innerHTML = this.template.render(this);
						this.template.updateTemplateView(this);
					}
				}, {
					key: 'updateTableView',
					value: function updateTableView(prop) {
						if (prop === "mobileWidth") {
							this.updateMobileView();
							return;
						}
						this.rows.forEach((function (row) {
							row[prop] = this[prop];
						}).bind(this));
						this.columns.forEach((function (col) {
							col[prop] = this[prop];prop === "sort" || prop === "filter" ? this.setColumnListeners(col) : null;
						}).bind(this));
					}
				}, {
					key: 'updateMobileView',
					value: function updateMobileView() {
						this.convertToMobile();
						this.windowListener();
					}
				}, {
					key: 'updateWidths',
					value: function updateWidths() {
						var _this = this;

						this.updateColumns();
						this.rows.map(function (row) {
							return row.columns = _this.columns;
						});
					}
				}, {
					key: 'propertyChangedCallback',
					value: function propertyChangedCallback(prop, oldValue, newValue) {
						if (oldValue === newValue) return;
						if (prop === "apiUrl") this.fetchData();
						if (prop === "scrollHeight") this.template.updateTemplateView(this);
						if (prop == "theme" || prop == "borders" || prop == "rowAlternating" || prop == "sort" || prop == "mobileWidth") {
							this.updateTableView(prop);
						}
					}
				}, {
					key: 'fetchData',
					value: function fetchData() {
						this.services.buildService(this);
						this.services.loadData(this).then((function (data) {
							this.originalData = JSON.parse(JSON.stringify(data));
							this.data = data;
							this.buildColsAndRows();
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
					// assembly of child classes
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
							row.idx = idx;
							row.rowAlternating = this.rowAlternating;
							return row;
						}).bind(this));
						this.template.addRows(this);
					}
				}, {
					key: 'updateColumns',
					value: function updateColumns() {
						var colAmount = this.columns.map(function (col) {
							return !col.width || isNaN(col.width) ? col : null;
						}).filter(function (col) {
							return col ? col : null;
						}).length,
						    flexWidth = 100;
						this.columns.map(function (col) {
							return !isNaN(col.width) ? parseInt(col.width) : null;
						}).filter(function (width) {
							return width ? parseInt(width) : null;
						}).forEach(function (width) {
							flexWidth = flexWidth - width;
						});
						this.columns = this.columns.map((function (col, idx) {
							col.siblings = this.columns;
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
					decorators: [property({ type: 'boolean' })],
					initializer: function initializer() {
						return false;
					},
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
					key: 'fetchOptions',
					decorators: [nullable, property],
					initializer: null,
					enumerable: true
				}, {
					key: 'fetchPayload',
					decorators: [nullable, property],
					initializer: null,
					enumerable: true
				}, {
					key: 'bindingProperty',
					decorators: [nullable, property],
					initializer: null,
					enumerable: true
				}, {
					key: 'scrollHeight',
					decorators: [nullable, property],
					initializer: null,
					enumerable: true
				}], null, _instanceInitializers);

				return VoyaTable;
			})(HTMLElement || Element);

			document.registerElement('voya-table', VoyaTable);
		}
	};
});
$__System.registerDynamic("18", ["19"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var _Object$defineProperty = req('19')["default"];
  exports["default"] = (function() {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor)
          descriptor.writable = true;
        _Object$defineProperty(target, descriptor.key, descriptor);
      }
    }
    return function(Constructor, protoProps, staticProps) {
      if (protoProps)
        defineProperties(Constructor.prototype, protoProps);
      if (staticProps)
        defineProperties(Constructor, staticProps);
      return Constructor;
    };
  })();
  exports.__esModule = true;
  global.define = __define;
  return module.exports;
});

$__System.register('1a', ['16', '18'], function (_export) {
    var _classCallCheck, _createClass, Formats, format;

    return {
        setters: [function (_2) {
            _classCallCheck = _2['default'];
        }, function (_) {
            _createClass = _['default'];
        }],
        execute: function () {
            'use strict';

            Formats = (function () {
                function Formats() {
                    _classCallCheck(this, Formats);
                }

                _createClass(Formats, [{
                    key: 'getFormat',
                    value: function getFormat() {
                        return {
                            currency: function currency(item) {
                                return isNaN(item) || item === '' ? item : '$ ' + parseFloat(item).toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
                            }
                        };
                    }
                }]);

                return Formats;
            })();

            _export('Formats', Formats);

            format = new Formats();

            _export('format', format);
        }
    };
});
$__System.register('8', [], function (_export) {
    'use strict';

    _export('getNestedData', getNestedData);

    _export('sortData', sortData);

    function getNestedData(searchString, object) {
        var value = searchString.split('.').map(function (property, idx) {
            if (typeof object[property] === 'object' && idx < searchString.split('.').length - 1) {
                return getNestedData(searchString.split('.').slice(idx + 1).join("."), object[property]);
            }
            object[property] = object[property] == 0 ? "" + object[property] : object[property];
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
$__System.register("1b", [], function (_export) {
    "use strict";

    _export("VoyaCellTemplate", VoyaCellTemplate);

    function VoyaCellTemplate() {
        function render(el) {
            el.style.width = isNaN(el.width) ? el.width : el.width + "%";;
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
$__System.register('1c', ['6', '8', '12', '13', '14', '15', '16', '17', '1b', '1a'], function (_export) {
    var _Object$keys, getNestedData, _get, _inherits, _defineDecoratedPropertyDescriptor, _createDecoratedClass, _classCallCheck, property, nullable, VoyaCellTemplate, format, VoyaCell;

    return {
        setters: [function (_6) {
            _Object$keys = _6['default'];
        }, function (_8) {
            getNestedData = _8.getNestedData;
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
        }, function (_b) {
            VoyaCellTemplate = _b.VoyaCellTemplate;
        }, function (_a) {
            format = _a.format;
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

                    _defineDecoratedPropertyDescriptor(this, 'cellViewName', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'width', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'template', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'cellValue', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'cellData', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'cellTemplate', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'dataFormat', _instanceInitializers);

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
                        this.cellTemplate.split('#').slice(1).map(function (dataProperty) {
                            return dataProperty.substring(2, dataProperty.indexOf("}}"));
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
                            var replace = new RegExp("\(\\#\\{{(\\^?)" + item + "\\}}\)");
                            if (this.dataFormat) {
                                this.cellData[item] = format.getFormat()[this.dataFormat](this.cellData[item]);
                            }
                            this.cellTemplate = this.cellTemplate.replace(replace, this.cellData[item]);
                        }).bind(this));
                    }
                }, {
                    key: 'cellName',
                    decorators: [property],
                    initializer: null,
                    enumerable: true
                }, {
                    key: 'cellViewName',
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
                    key: 'dataFormat',
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
$__System.register("1d", [], function (_export) {
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
            if (el.rowAlternating) {
                el.classList.forEach(function (CSSclass) {
                    if (CSSclass.indexOf("odd") != -1 || CSSclass.indexOf("even") != -1) {
                        el.classList.remove(CSSclass);
                    }
                });
                el.classList.add(el.rowAlternating);
            }
            if (el.borders) {
                el.classList.forEach(function (CSSclass) {
                    if (CSSclass.indexOf("vertical") != -1 || CSSclass.indexOf("horizontal") != -1 || CSSclass.indexOf("none") != -1) {
                        el.classList.remove(CSSclass);
                    }
                });
                el.classList.add(el.borders);
            }
            if (el.theme) {
                el.classList.forEach(function (CSSclass) {
                    if (CSSclass.indexOf("orange") != -1 || CSSclass.indexOf("white") != -1) {
                        el.classList.remove(CSSclass);
                    }
                });
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
$__System.register('1e', ['12', '13', '14', '15', '16', '17', '1d'], function (_export) {
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
        }, function (_d) {
            VoyaRowTemplate = _d.VoyaRowTemplate;
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

                    _defineDecoratedPropertyDescriptor(this, 'idx', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'borders', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'rowAlternating', _instanceInitializers);

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
                        this.rowAlternating;
                    }
                }, {
                    key: 'render',
                    value: function render() {
                        this.innerHTML = this.template.render(this);
                    }
                }, {
                    key: 'propertyChangedCallback',
                    value: function propertyChangedCallback(prop, oldValue, newValue) {
                        if (oldValue === newValue) return;
                        if (prop === "rowAlternating") {
                            this.rowAlternating = this.rowAlternating ? this.idx % 2 === 0 ? "even" : "odd" : null;
                        }
                        if (prop === "rowAlternating" || prop === "borders" || prop == "theme") {
                            this.template.updateRowTheme(this);
                        }
                        if (prop === "rowData") {
                            this.buildCells();
                        }
                        if (prop === "columns") {
                            this.updateCellView();
                        }
                    }
                }, {
                    key: 'updateCellView',
                    value: function updateCellView() {
                        this.cells = this.cells.map((function (cell) {
                            var col = this.columns.map(function (col) {
                                return col.name === cell.cellViewName ? col : null;
                            }).filter(function (col) {
                                return col ? col : null;
                            })[0];
                            cell.width = col.width;
                            return cell;
                        }).bind(this));
                    }
                }, {
                    key: 'buildCells',
                    value: function buildCells() {
                        this.cells = this.columns.map((function (col) {
                            var cell = document.createElement("voya-cell");
                            cell.cellViewName = col.name;
                            cell.cellName = col.name;
                            cell.mobile = col.mobile;
                            cell.label = col.mobileLabel ? col.colLabel : null;
                            cell.cellValue = col.name ? this.rowData[cell.cellName] : this.rowData;
                            cell.cellTemplate = col.cellTemplate ? col.cellTemplate : null;
                            cell.dataFormat = col.dataFormat ? col.dataFormat : null;
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
                    key: 'idx',
                    decorators: [nullable, property],
                    initializer: null,
                    enumerable: true
                }, {
                    key: 'borders',
                    decorators: [nullable, property],
                    initializer: null,
                    enumerable: true
                }, {
                    key: 'rowAlternating',
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
$__System.register('1f', ['14', '15', '16', '17'], function (_export) {
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
$__System.register("20", ["14", "15", "16", "17"], function (_export) {
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
                        this.event.columnName = this.col.colLabel;
                        this.event.colIndex = this.col.index;
                        this.button.dispatchEvent(this.event);
                    }
                }, {
                    key: "removeActiveSort",
                    value: function removeActiveSort(e) {
                        if (this.col.colLabel === e.columnName) return;
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
$__System.register('21', ['22'], function (_export) {
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
                    return !/false/i.test(value);
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
$__System.registerDynamic("23", [], true, function(req, exports, module) {
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

$__System.registerDynamic("24", ["23"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = req('23');
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("25", [], true, function(req, exports, module) {
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

$__System.registerDynamic("26", ["25"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = req('25');
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("27", ["b", "28"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = req('b'),
      toIObject = req('28'),
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

$__System.registerDynamic("29", ["c", "27"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $export = req('c'),
      $entries = req('27')(true);
  $export($export.S, 'Object', {entries: function entries(it) {
      return $entries(it);
    }});
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("2a", ["29", "e"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  req('29');
  module.exports = req('e').Object.entries;
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("2b", ["2a"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": req('2a'),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("2c", ["b", "2d", "2e", "2f"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = req('b'),
      toObject = req('2d'),
      IObject = req('2e');
  module.exports = req('2f')(function() {
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

$__System.registerDynamic("30", ["c", "2c"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $export = req('c');
  $export($export.S + $export.F, 'Object', {assign: req('2c')});
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("31", ["30", "e"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  req('30');
  module.exports = req('e').Object.assign;
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("22", ["31"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": req('31'),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("32", ["33", "34", "35", "e"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var classof = req('33'),
      ITERATOR = req('34')('iterator'),
      Iterators = req('35');
  module.exports = req('e').isIterable = function(it) {
    var O = Object(it);
    return O[ITERATOR] !== undefined || '@@iterator' in O || Iterators.hasOwnProperty(classof(O));
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("36", ["37", "38", "32"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  req('37');
  req('38');
  module.exports = req('32');
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("39", ["36"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": req('36'),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("3a", ["3b", "3c", "e"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var anObject = req('3b'),
      get = req('3c');
  module.exports = req('e').getIterator = function(it) {
    var iterFn = get(it);
    if (typeof iterFn != 'function')
      throw TypeError(it + ' is not iterable!');
    return anObject(iterFn.call(it));
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("3d", ["3e", "3f"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var toInteger = req('3e'),
      defined = req('3f');
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

$__System.registerDynamic("38", ["3d", "40"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var $at = req('3d')(true);
  req('40')(String, 'String', function(iterated) {
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

$__System.registerDynamic("41", ["37", "38", "3a"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  req('37');
  req('38');
  module.exports = req('3a');
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("42", ["41"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": req('41'),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("43", ["42", "39"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var _getIterator = req('42')["default"];
  var _isIterable = req('39')["default"];
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

$__System.register('17', ['21', '22', '24', '26', '42', '43', '2b'], function (_export) {
    var decorator, coerce, _Object$assign, decamelize, camelcase, _getIterator, _slicedToArray, _Object$entries, property, nullable, ui;

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
                        if (value != undefined) {
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
        setters: [function (_6) {
            decorator = _6.decorator;
            coerce = _6.coerce;
        }, function (_2) {
            _Object$assign = _2['default'];
        }, function (_5) {
            decamelize = _5['default'];
        }, function (_4) {
            camelcase = _4['default'];
        }, function (_3) {
            _getIterator = _3['default'];
        }, function (_) {
            _slicedToArray = _['default'];
        }, function (_b) {
            _Object$entries = _b['default'];
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
$__System.register("44", [], function (_export) {
    "use strict";

    _export("VoyaColumnTemplate", VoyaColumnTemplate);

    function VoyaColumnTemplate() {
        function render(data) {
            return "<div class=\"voya-col " + data.colLabel + "\"><div class=\"label\">" + data.colLabel + "</div> <div class=\"voya-col-actions\"></div></div>";
        }
        function addButton(el, button) {
            el.querySelector(".voya-col-actions").appendChild(button);
        }
        function updateTheme(el) {
            if (el.theme) {
                el.classList.forEach(function (CSSclass) {
                    if (CSSclass.indexOf("orange") != -1 || CSSclass.indexOf("white") != -1) {
                        el.classList.remove(CSSclass);
                    }
                });
                el.classList.add(el.theme);
            }
            if (el.borders) {
                el.classList.forEach(function (CSSclass) {
                    if (CSSclass.indexOf("vertical") != -1 || CSSclass.indexOf("horizontal") != -1 || CSSclass.indexOf("none") != -1) {
                        el.classList.remove(CSSclass);
                    }
                });
                el.classList.add(el.borders);
            }
        }
        function updateColumnWidth(el) {
            if (!el.width) return;
            el.style.width = isNaN(el.width) ? el.width : el.width + "%";
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
$__System.registerDynamic("45", ["b", "46", "c", "2f", "47", "48", "49", "4a", "4b", "4c", "4d"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var $ = req('b'),
      global = req('46'),
      $export = req('c'),
      fails = req('2f'),
      hide = req('47'),
      redefineAll = req('48'),
      forOf = req('49'),
      strictNew = req('4a'),
      isObject = req('4b'),
      setToStringTag = req('4c'),
      DESCRIPTORS = req('4d');
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

$__System.registerDynamic("4e", ["4f"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var cof = req('4f');
  module.exports = Array.isArray || function(arg) {
    return cof(arg) == 'Array';
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("50", ["4b", "4e", "34"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var isObject = req('4b'),
      isArray = req('4e'),
      SPECIES = req('34')('species');
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

$__System.registerDynamic("51", ["d", "2e", "2d", "52", "50"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var ctx = req('d'),
      IObject = req('2e'),
      toObject = req('2d'),
      toLength = req('52'),
      asc = req('50');
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

$__System.registerDynamic("33", ["4f", "34"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var cof = req('4f'),
      TAG = req('34')('toStringTag'),
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

$__System.registerDynamic("3c", ["33", "34", "35", "e"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var classof = req('33'),
      ITERATOR = req('34')('iterator'),
      Iterators = req('35');
  module.exports = req('e').getIteratorMethod = function(it) {
    if (it != undefined)
      return it[ITERATOR] || it['@@iterator'] || Iterators[classof(it)];
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("3e", [], true, function(req, exports, module) {
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

$__System.registerDynamic("52", ["3e"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var toInteger = req('3e'),
      min = Math.min;
  module.exports = function(it) {
    return it > 0 ? min(toInteger(it), 0x1fffffffffffff) : 0;
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("53", ["35", "34"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var Iterators = req('35'),
      ITERATOR = req('34')('iterator'),
      ArrayProto = Array.prototype;
  module.exports = function(it) {
    return it !== undefined && (Iterators.Array === it || ArrayProto[ITERATOR] === it);
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("54", ["3b"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var anObject = req('3b');
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

$__System.registerDynamic("49", ["d", "54", "53", "3b", "52", "3c"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var ctx = req('d'),
      call = req('54'),
      isArrayIter = req('53'),
      anObject = req('3b'),
      toLength = req('52'),
      getIterFn = req('3c');
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

$__System.registerDynamic("4a", [], true, function(req, exports, module) {
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

$__System.registerDynamic("48", ["55"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var redefine = req('55');
  module.exports = function(target, src) {
    for (var key in src)
      redefine(target, key, src[key]);
    return target;
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("56", ["47", "48", "3b", "4b", "4a", "49", "51", "57", "58"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var hide = req('47'),
      redefineAll = req('48'),
      anObject = req('3b'),
      isObject = req('4b'),
      strictNew = req('4a'),
      forOf = req('49'),
      createArrayMethod = req('51'),
      $has = req('57'),
      WEAK = req('58')('weak'),
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

$__System.registerDynamic("59", ["b", "55", "56", "4b", "57", "45"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var $ = req('b'),
      redefine = req('55'),
      weak = req('56'),
      isObject = req('4b'),
      has = req('57'),
      frozenStore = weak.frozenStore,
      WEAK = weak.WEAK,
      isExtensible = Object.isExtensible || isObject,
      tmp = {};
  var $WeakMap = req('45')('WeakMap', function(get) {
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

$__System.registerDynamic("58", [], true, function(req, exports, module) {
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

$__System.registerDynamic("5a", ["46"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var global = req('46'),
      SHARED = '__core-js_shared__',
      store = global[SHARED] || (global[SHARED] = {});
  module.exports = function(key) {
    return store[key] || (store[key] = {});
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("34", ["5a", "58", "46"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var store = req('5a')('wks'),
      uid = req('58'),
      Symbol = req('46').Symbol;
  module.exports = function(name) {
    return store[name] || (store[name] = Symbol && Symbol[name] || (Symbol || uid)('Symbol.' + name));
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("4c", ["b", "57", "34"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var def = req('b').setDesc,
      has = req('57'),
      TAG = req('34')('toStringTag');
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

$__System.registerDynamic("5b", ["b", "5c", "4c", "47", "34"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var $ = req('b'),
      descriptor = req('5c'),
      setToStringTag = req('4c'),
      IteratorPrototype = {};
  req('47')(IteratorPrototype, req('34')('iterator'), function() {
    return this;
  });
  module.exports = function(Constructor, NAME, next) {
    Constructor.prototype = $.create(IteratorPrototype, {next: descriptor(1, next)});
    setToStringTag(Constructor, NAME + ' Iterator');
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("57", [], true, function(req, exports, module) {
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

$__System.registerDynamic("4d", ["2f"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = !req('2f')(function() {
    return Object.defineProperty({}, 'a', {get: function() {
        return 7;
      }}).a != 7;
  });
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("5c", [], true, function(req, exports, module) {
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

$__System.registerDynamic("47", ["b", "5c", "4d"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = req('b'),
      createDesc = req('5c');
  module.exports = req('4d') ? function(object, key, value) {
    return $.setDesc(object, key, createDesc(1, value));
  } : function(object, key, value) {
    object[key] = value;
    return object;
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("55", ["47"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = req('47');
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("5d", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = true;
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("40", ["5d", "c", "55", "47", "57", "35", "5b", "4c", "b", "34"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var LIBRARY = req('5d'),
      $export = req('c'),
      redefine = req('55'),
      hide = req('47'),
      has = req('57'),
      Iterators = req('35'),
      $iterCreate = req('5b'),
      setToStringTag = req('4c'),
      getProto = req('b').getProto,
      ITERATOR = req('34')('iterator'),
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

$__System.registerDynamic("35", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {};
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("5e", [], true, function(req, exports, module) {
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

$__System.registerDynamic("5f", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = function() {};
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("60", ["5f", "5e", "35", "28", "40"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var addToUnscopables = req('5f'),
      step = req('5e'),
      Iterators = req('35'),
      toIObject = req('28');
  module.exports = req('40')(Array, 'Array', function(iterated, kind) {
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

$__System.registerDynamic("37", ["60", "35"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  req('60');
  var Iterators = req('35');
  Iterators.NodeList = Iterators.HTMLCollection = Iterators.Array;
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("61", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  "format cjs";
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("62", ["61", "37", "59", "e"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  req('61');
  req('37');
  req('59');
  module.exports = req('e').WeakMap;
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("63", ["62"], true, function(req, exports, module) {
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

$__System.registerDynamic("16", [], true, function(req, exports, module) {
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

$__System.registerDynamic("15", ["19"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var _Object$defineProperty = req('19')["default"];
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

$__System.registerDynamic("64", ["b"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = req('b');
  module.exports = function defineProperty(it, key, desc) {
    return $.setDesc(it, key, desc);
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("19", ["64"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": req('64'),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("14", ["19"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var _Object$defineProperty = req('19')["default"];
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

$__System.registerDynamic("3b", ["4b"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var isObject = req('4b');
  module.exports = function(it) {
    if (!isObject(it))
      throw TypeError(it + ' is not an object!');
    return it;
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("4b", [], true, function(req, exports, module) {
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

$__System.registerDynamic("65", ["b", "4b", "3b", "d"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var getDesc = req('b').getDesc,
      isObject = req('4b'),
      anObject = req('3b');
  var check = function(O, proto) {
    anObject(O);
    if (!isObject(proto) && proto !== null)
      throw TypeError(proto + ": can't set as prototype!");
  };
  module.exports = {
    set: Object.setPrototypeOf || ('__proto__' in {} ? function(test, buggy, set) {
      try {
        set = req('d')(Function.call, getDesc(Object.prototype, '__proto__').set, 2);
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

$__System.registerDynamic("66", ["c", "65"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $export = req('c');
  $export($export.S, 'Object', {setPrototypeOf: req('65').set});
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("67", ["66", "e"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  req('66');
  module.exports = req('e').Object.setPrototypeOf;
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

$__System.registerDynamic("69", ["b"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = req('b');
  module.exports = function create(P, D) {
    return $.create(P, D);
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("6a", ["69"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": req('69'),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("13", ["6a", "68"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var _Object$create = req('6a')["default"];
  var _Object$setPrototypeOf = req('68')["default"];
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

$__System.registerDynamic("4f", [], true, function(req, exports, module) {
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

$__System.registerDynamic("2e", ["4f"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var cof = req('4f');
  module.exports = Object('z').propertyIsEnumerable(0) ? Object : function(it) {
    return cof(it) == 'String' ? it.split('') : Object(it);
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("28", ["2e", "3f"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var IObject = req('2e'),
      defined = req('3f');
  module.exports = function(it) {
    return IObject(defined(it));
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("6b", ["28", "6c"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var toIObject = req('28');
  req('6c')('getOwnPropertyDescriptor', function($getOwnPropertyDescriptor) {
    return function getOwnPropertyDescriptor(it, key) {
      return $getOwnPropertyDescriptor(toIObject(it), key);
    };
  });
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("b", [], true, function(req, exports, module) {
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

$__System.registerDynamic("6d", ["b", "6b"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = req('b');
  req('6b');
  module.exports = function getOwnPropertyDescriptor(it, key) {
    return $.getDesc(it, key);
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("6e", ["6d"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": req('6d'),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("12", ["6e"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var _Object$getOwnPropertyDescriptor = req('6e')["default"];
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

$__System.register('6f', ['6', '12', '13', '14', '15', '16', '17', '20', '44', '63', '1f'], function (_export) {
    var _Object$keys, _get, _inherits, _defineDecoratedPropertyDescriptor, _createDecoratedClass, _classCallCheck, property, nullable, Sort, VoyaColumnTemplate, _WeakMap, Filter, _features, _privateProperties, VoyaColumn;

    return {
        setters: [function (_7) {
            _Object$keys = _7['default'];
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
        }, function (_9) {
            property = _9.property;
            nullable = _9.nullable;
        }, function (_10) {
            Sort = _10.Sort;
        }, function (_8) {
            VoyaColumnTemplate = _8.VoyaColumnTemplate;
        }, function (_6) {
            _WeakMap = _6['default'];
        }, function (_f) {
            Filter = _f.Filter;
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

                    _defineDecoratedPropertyDescriptor(this, 'event', _instanceInitializers);

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

                    _defineDecoratedPropertyDescriptor(this, 'dataFormat', _instanceInitializers);

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
                        this.colLabel = this.innerHTML;
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
                            if (prop == 'sort') {
                                this.assembleFeatures();
                            }
                            if (prop == "theme" || prop == "borders") {
                                this.template.updateTheme(this);
                            }
                            if (prop === "width") {
                                this.width = this.setWidth();
                                if (isNaN(this.width)) return;
                                this.dispatchEvent(this.event);
                                this.template.updateColumnWidth(this);
                            }
                            if ((prop == "colAmount" || prop == "flexWidth") && (!this.width || isNaN(this.width))) {
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
                        if (!this.width || isNaN(this.width)) return this.width;
                        return this.width;
                    }
                }, {
                    key: 'setColumnFlexWidth',
                    value: function setColumnFlexWidth() {
                        if (!this.flexWidth || !this.colAmount) return;
                        return this.flexWidth / this.colAmount + "%";
                    }
                }, {
                    key: 'event',
                    decorators: [property],
                    initializer: function initializer() {
                        return new CustomEvent("columnWidth", { bubbles: true });
                    },
                    enumerable: true
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
                    key: 'dataFormat',
                    decorators: [property],
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
$__System.register('70', ['11', '6f', '1e', '1c'], function (_export) {
  /* please keep this in specfic order */
  'use strict';

  return {
    setters: [function (_) {}, function (_f) {}, function (_e) {}, function (_c) {}],
    execute: function () {}
  };
});
$__System.registerDynamic("2f", [], true, function(req, exports, module) {
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

$__System.registerDynamic("71", [], true, function(req, exports, module) {
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

$__System.registerDynamic("d", ["71"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var aFunction = req('71');
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

$__System.registerDynamic("e", [], true, function(req, exports, module) {
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

$__System.registerDynamic("46", [], true, function(req, exports, module) {
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

$__System.registerDynamic("c", ["46", "e", "d"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var global = req('46'),
      core = req('e'),
      ctx = req('d'),
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

$__System.registerDynamic("6c", ["c", "e", "2f"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $export = req('c'),
      core = req('e'),
      fails = req('2f');
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

$__System.registerDynamic("3f", [], true, function(req, exports, module) {
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

$__System.registerDynamic("2d", ["3f"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var defined = req('3f');
  module.exports = function(it) {
    return Object(defined(it));
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("72", ["2d", "6c"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var toObject = req('2d');
  req('6c')('keys', function($keys) {
    return function keys(it) {
      return $keys(toObject(it));
    };
  });
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("73", ["72", "e"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  req('72');
  module.exports = req('e').Object.keys;
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("6", ["73"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": req('73'),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

$__System.register('1', ['4', '6', '70'], function (_export) {
	var delegate, _Object$keys, eventMethod;

	function appLoaded() {
		var toolbar = document.querySelector('.toolbar');
		var voyaTable = document.querySelector('voya-table');

		delegate(toolbar).on('click', "li", function (e) {
			var value = e.target.dataset.value == 'true' || e.target.dataset.value == 'false' ? JSON.parse(e.target.dataset.value) : e.target.dataset.value;
			if (e.target.dataset.property.indexOf("column") != -1) {
				var column = document.querySelector("voya-column");
				column[e.target.dataset.property.substring(e.target.dataset.property.indexOf(":") + 1)] = value;
				return;
			}

			voyaTable[e.target.dataset.property] = e.target.dataset.value.indexOf(":") != -1 ? buildValue(e) : value;
		});
	}
	return {
		setters: [function (_3) {
			delegate = _3['default'];
		}, function (_) {
			_Object$keys = _['default'];
		}, function (_2) {}],
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