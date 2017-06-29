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
  "format cjs";
  (function(self) {
    'use strict';
    if (self.fetch) {
      return;
    }
    var support = {
      searchParams: 'URLSearchParams' in self,
      iterable: 'Symbol' in self && 'iterator' in Symbol,
      blob: 'FileReader' in self && 'Blob' in self && (function() {
        try {
          new Blob();
          return true;
        } catch (e) {
          return false;
        }
      })(),
      formData: 'FormData' in self,
      arrayBuffer: 'ArrayBuffer' in self
    };
    if (support.arrayBuffer) {
      var viewClasses = ['[object Int8Array]', '[object Uint8Array]', '[object Uint8ClampedArray]', '[object Int16Array]', '[object Uint16Array]', '[object Int32Array]', '[object Uint32Array]', '[object Float32Array]', '[object Float64Array]'];
      var isDataView = function(obj) {
        return obj && DataView.prototype.isPrototypeOf(obj);
      };
      var isArrayBufferView = ArrayBuffer.isView || function(obj) {
        return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1;
      };
    }
    function normalizeName(name) {
      if (typeof name !== 'string') {
        name = String(name);
      }
      if (/[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(name)) {
        throw new TypeError('Invalid character in header field name');
      }
      return name.toLowerCase();
    }
    function normalizeValue(value) {
      if (typeof value !== 'string') {
        value = String(value);
      }
      return value;
    }
    function iteratorFor(items) {
      var iterator = {next: function() {
          var value = items.shift();
          return {
            done: value === undefined,
            value: value
          };
        }};
      if (support.iterable) {
        iterator[Symbol.iterator] = function() {
          return iterator;
        };
      }
      return iterator;
    }
    function Headers(headers) {
      this.map = {};
      if (headers instanceof Headers) {
        headers.forEach(function(value, name) {
          this.append(name, value);
        }, this);
      } else if (headers) {
        Object.getOwnPropertyNames(headers).forEach(function(name) {
          this.append(name, headers[name]);
        }, this);
      }
    }
    Headers.prototype.append = function(name, value) {
      name = normalizeName(name);
      value = normalizeValue(value);
      var list = this.map[name];
      if (!list) {
        list = [];
        this.map[name] = list;
      }
      list.push(value);
    };
    Headers.prototype['delete'] = function(name) {
      delete this.map[normalizeName(name)];
    };
    Headers.prototype.get = function(name) {
      var values = this.map[normalizeName(name)];
      return values ? values[0] : null;
    };
    Headers.prototype.getAll = function(name) {
      return this.map[normalizeName(name)] || [];
    };
    Headers.prototype.has = function(name) {
      return this.map.hasOwnProperty(normalizeName(name));
    };
    Headers.prototype.set = function(name, value) {
      this.map[normalizeName(name)] = [normalizeValue(value)];
    };
    Headers.prototype.forEach = function(callback, thisArg) {
      Object.getOwnPropertyNames(this.map).forEach(function(name) {
        this.map[name].forEach(function(value) {
          callback.call(thisArg, value, name, this);
        }, this);
      }, this);
    };
    Headers.prototype.keys = function() {
      var items = [];
      this.forEach(function(value, name) {
        items.push(name);
      });
      return iteratorFor(items);
    };
    Headers.prototype.values = function() {
      var items = [];
      this.forEach(function(value) {
        items.push(value);
      });
      return iteratorFor(items);
    };
    Headers.prototype.entries = function() {
      var items = [];
      this.forEach(function(value, name) {
        items.push([name, value]);
      });
      return iteratorFor(items);
    };
    if (support.iterable) {
      Headers.prototype[Symbol.iterator] = Headers.prototype.entries;
    }
    function consumed(body) {
      if (body.bodyUsed) {
        return Promise.reject(new TypeError('Already read'));
      }
      body.bodyUsed = true;
    }
    function fileReaderReady(reader) {
      return new Promise(function(resolve, reject) {
        reader.onload = function() {
          resolve(reader.result);
        };
        reader.onerror = function() {
          reject(reader.error);
        };
      });
    }
    function readBlobAsArrayBuffer(blob) {
      var reader = new FileReader();
      var promise = fileReaderReady(reader);
      reader.readAsArrayBuffer(blob);
      return promise;
    }
    function readBlobAsText(blob) {
      var reader = new FileReader();
      var promise = fileReaderReady(reader);
      reader.readAsText(blob);
      return promise;
    }
    function readArrayBufferAsText(buf) {
      var view = new Uint8Array(buf);
      var chars = new Array(view.length);
      for (var i = 0; i < view.length; i++) {
        chars[i] = String.fromCharCode(view[i]);
      }
      return chars.join('');
    }
    function bufferClone(buf) {
      if (buf.slice) {
        return buf.slice(0);
      } else {
        var view = new Uint8Array(buf.byteLength);
        view.set(new Uint8Array(buf));
        return view.buffer;
      }
    }
    function Body() {
      this.bodyUsed = false;
      this._initBody = function(body) {
        this._bodyInit = body;
        if (!body) {
          this._bodyText = '';
        } else if (typeof body === 'string') {
          this._bodyText = body;
        } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
          this._bodyBlob = body;
        } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
          this._bodyFormData = body;
        } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
          this._bodyText = body.toString();
        } else if (support.arrayBuffer && support.blob && isDataView(body)) {
          this._bodyArrayBuffer = bufferClone(body.buffer);
          this._bodyInit = new Blob([this._bodyArrayBuffer]);
        } else if (support.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
          this._bodyArrayBuffer = bufferClone(body);
        } else {
          throw new Error('unsupported BodyInit type');
        }
        if (!this.headers.get('content-type')) {
          if (typeof body === 'string') {
            this.headers.set('content-type', 'text/plain;charset=UTF-8');
          } else if (this._bodyBlob && this._bodyBlob.type) {
            this.headers.set('content-type', this._bodyBlob.type);
          } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
            this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
          }
        }
      };
      if (support.blob) {
        this.blob = function() {
          var rejected = consumed(this);
          if (rejected) {
            return rejected;
          }
          if (this._bodyBlob) {
            return Promise.resolve(this._bodyBlob);
          } else if (this._bodyArrayBuffer) {
            return Promise.resolve(new Blob([this._bodyArrayBuffer]));
          } else if (this._bodyFormData) {
            throw new Error('could not read FormData body as blob');
          } else {
            return Promise.resolve(new Blob([this._bodyText]));
          }
        };
        this.arrayBuffer = function() {
          if (this._bodyArrayBuffer) {
            return consumed(this) || Promise.resolve(this._bodyArrayBuffer);
          } else {
            return this.blob().then(readBlobAsArrayBuffer);
          }
        };
      }
      this.text = function() {
        var rejected = consumed(this);
        if (rejected) {
          return rejected;
        }
        if (this._bodyBlob) {
          return readBlobAsText(this._bodyBlob);
        } else if (this._bodyArrayBuffer) {
          return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer));
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as text');
        } else {
          return Promise.resolve(this._bodyText);
        }
      };
      if (support.formData) {
        this.formData = function() {
          return this.text().then(decode);
        };
      }
      this.json = function() {
        return this.text().then(JSON.parse);
      };
      return this;
    }
    var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT'];
    function normalizeMethod(method) {
      var upcased = method.toUpperCase();
      return (methods.indexOf(upcased) > -1) ? upcased : method;
    }
    function Request(input, options) {
      options = options || {};
      var body = options.body;
      if (typeof input === 'string') {
        this.url = input;
      } else {
        if (input.bodyUsed) {
          throw new TypeError('Already read');
        }
        this.url = input.url;
        this.credentials = input.credentials;
        if (!options.headers) {
          this.headers = new Headers(input.headers);
        }
        this.method = input.method;
        this.mode = input.mode;
        if (!body && input._bodyInit != null) {
          body = input._bodyInit;
          input.bodyUsed = true;
        }
      }
      this.credentials = options.credentials || this.credentials || 'omit';
      if (options.headers || !this.headers) {
        this.headers = new Headers(options.headers);
      }
      this.method = normalizeMethod(options.method || this.method || 'GET');
      this.mode = options.mode || this.mode || null;
      this.referrer = null;
      if ((this.method === 'GET' || this.method === 'HEAD') && body) {
        throw new TypeError('Body not allowed for GET or HEAD requests');
      }
      this._initBody(body);
    }
    Request.prototype.clone = function() {
      return new Request(this, {body: this._bodyInit});
    };
    function decode(body) {
      var form = new FormData();
      body.trim().split('&').forEach(function(bytes) {
        if (bytes) {
          var split = bytes.split('=');
          var name = split.shift().replace(/\+/g, ' ');
          var value = split.join('=').replace(/\+/g, ' ');
          form.append(decodeURIComponent(name), decodeURIComponent(value));
        }
      });
      return form;
    }
    function parseHeaders(rawHeaders) {
      var headers = new Headers();
      rawHeaders.split('\r\n').forEach(function(line) {
        var parts = line.split(':');
        var key = parts.shift().trim();
        if (key) {
          var value = parts.join(':').trim();
          headers.append(key, value);
        }
      });
      return headers;
    }
    Body.call(Request.prototype);
    function Response(bodyInit, options) {
      if (!options) {
        options = {};
      }
      this.type = 'default';
      this.status = 'status' in options ? options.status : 200;
      this.ok = this.status >= 200 && this.status < 300;
      this.statusText = 'statusText' in options ? options.statusText : 'OK';
      this.headers = new Headers(options.headers);
      this.url = options.url || '';
      this._initBody(bodyInit);
    }
    Body.call(Response.prototype);
    Response.prototype.clone = function() {
      return new Response(this._bodyInit, {
        status: this.status,
        statusText: this.statusText,
        headers: new Headers(this.headers),
        url: this.url
      });
    };
    Response.error = function() {
      var response = new Response(null, {
        status: 0,
        statusText: ''
      });
      response.type = 'error';
      return response;
    };
    var redirectStatuses = [301, 302, 303, 307, 308];
    Response.redirect = function(url, status) {
      if (redirectStatuses.indexOf(status) === -1) {
        throw new RangeError('Invalid status code');
      }
      return new Response(null, {
        status: status,
        headers: {location: url}
      });
    };
    self.Headers = Headers;
    self.Request = Request;
    self.Response = Response;
    self.fetch = function(input, init) {
      return new Promise(function(resolve, reject) {
        var request = new Request(input, init);
        var xhr = new XMLHttpRequest();
        xhr.onload = function() {
          var options = {
            status: xhr.status,
            statusText: xhr.statusText,
            headers: parseHeaders(xhr.getAllResponseHeaders() || '')
          };
          options.url = 'responseURL' in xhr ? xhr.responseURL : options.headers.get('X-Request-URL');
          var body = 'response' in xhr ? xhr.response : xhr.responseText;
          resolve(new Response(body, options));
        };
        xhr.onerror = function() {
          reject(new TypeError('Network request failed'));
        };
        xhr.ontimeout = function() {
          reject(new TypeError('Network request failed'));
        };
        xhr.open(request.method, request.url, true);
        if (request.credentials === 'include') {
          xhr.withCredentials = true;
        }
        if ('responseType' in xhr && support.blob) {
          xhr.responseType = 'blob';
        }
        request.headers.forEach(function(value, name) {
          xhr.setRequestHeader(name, value);
        });
        xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit);
      });
    };
    self.fetch.polyfill = true;
  })(typeof self !== 'undefined' ? self : this);
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("3", ["2"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = req('2');
  global.define = __define;
  return module.exports;
});

$__System.register('4', ['5'], function (_export) {
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
$__System.register('6', ['4', '7'], function (_export) {
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
                return response;
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
            filter: filter,
            parseData: parseData
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
$__System.register('8', ['9'], function (_export) {
	var _Array$from;

	function VoyaTableTemplate() {
		function render(el) {
			return createTableWrapper(buildWrapper(el));;
		}
		function createTableWrapper(tableContent) {
			var tempDiv = document.createElement('div');
			tempDiv.className = 'deep-ui-voya-table';
			tempDiv.innerHTML = tableContent;
			return tempDiv;
		}
		function buildWrapper(el) {
			return '<div class="voya-table-column-wrapper">\n\t\t\t\t\t\t<div class="voya-table-column-row"></div>\n\t\t\t\t</div>\n\t\t\t\t<div class="scroll-wrapper">\n\t\t\t\t<div class="voya-table-rows-wrapper"></div>\n\t\t\t\t</div>\n\t\t\t\t';
		}
		function addColumns(el) {
			el.columns.forEach(function (col) {
				el.querySelector(".voya-table-column-row").appendChild(col);
			});
		}
		function addRows(el) {
			el.rows.forEach(function (row) {
				el.querySelector(".voya-table-rows-wrapper").appendChild(row);
			});
		}
		function updateTemplateView(el) {
			el.querySelector(".scroll-wrapper").style.maxHeight = el.scrollHeight + "px";
		}
		function contentOverflows(el) {
			if (!el.scrollHeight) return false;
			var wrapper = el.querySelector('.voya-table-rows-wrapper');
			return el.scrollHeight < wrapper.scrollHeight;
		}
		function handleTableScrolling(el) {
			if (contentOverflows(el)) el.classList.add('hasOverflowContent');
		}
		function removeOldRows(el) {
			if (!el.rows) return;
			_Array$from(el.rows).forEach(function (row) {
				el.querySelector(".voya-table-rows-wrapper").removeChild(row);
			});
		}
		return {
			render: render,
			addColumns: addColumns,
			addRows: addRows,
			removeOldRows: removeOldRows,
			updateTemplateView: updateTemplateView,
			handleTableScrolling: handleTableScrolling
		};
	}

	return {
		setters: [function (_) {
			_Array$from = _['default'];
		}],
		execute: function () {
			'use strict';

			_export('VoyaTableTemplate', VoyaTableTemplate);
		}
	};
});
$__System.register('a', ['6', '8', '9', '10', '11', 'c', 'd', 'e', 'f', 'b'], function (_export) {
	var VoyaTableServices, VoyaTableTemplate, _Array$from, _classCallCheck, property, nullable, _get, _inherits, _defineDecoratedPropertyDescriptor, _createDecoratedClass, NativeHTMLElement, VoyaTable;

	return {
		setters: [function (_5) {
			VoyaTableServices = _5.VoyaTableServices;
		}, function (_3) {
			VoyaTableTemplate = _3.VoyaTableTemplate;
		}, function (_2) {
			_Array$from = _2['default'];
		}, function (_) {
			_classCallCheck = _['default'];
		}, function (_4) {
			property = _4.property;
			nullable = _4.nullable;
		}, function (_c) {
			_get = _c['default'];
		}, function (_d) {
			_inherits = _d['default'];
		}, function (_e) {
			_defineDecoratedPropertyDescriptor = _e['default'];
		}, function (_f) {
			_createDecoratedClass = _f['default'];
		}, function (_b) {
			NativeHTMLElement = _b.NativeHTMLElement;
		}],
		execute: function () {
			'use strict';

			VoyaTable = (function (_NativeHTMLElement) {
				var _instanceInitializers = {};

				_inherits(VoyaTable, _NativeHTMLElement);

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
						this.columns = _Array$from(this.querySelectorAll("voya-column"));
						this.render();
						this.addEventListener("columnWidth", this.updateWidths.bind(this));
						if (this.mobileWidth) {
							this.updateMobileView();
						}
						if (!this.apiUrl) return;
						this.fetchData();
						this.addTooltipListeners();
					}
				}, {
					key: 'attachedCallback',
					value: function attachedCallback() {
						this.addResizeListener();
					}
				}, {
					key: 'detachedCallback',
					value: function detachedCallback() {
						this.removeResizeListener();
					}
				}, {
					key: 'propertyChangedCallback',
					value: function propertyChangedCallback(prop, oldValue, newValue) {
						if (oldValue === newValue || !newValue) return;
						if (prop === "apiUrl") this.fetchData();
						if (prop === "data" && !Array.isArray(newValue)) {
							this.template.removeOldRows(this);
							this.mapDataToTable(this.services.parseData(this.bindingProperty, newValue, 0));
						}
						if (prop === "scrollHeight") this.template.updateTemplateView(this);
						if (prop == "theme" || prop == "borders" || prop == "rowAlternating" || prop == "sort" || prop == "mobileWidth") {
							this.updateTableView(prop);
						}
					}
				}, {
					key: 'render',
					value: function render() {
						this.appendChild(this.template.render(this));
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
					value: function updateMobileView(e) {
						var windowWidth = e ? e.target.innerWidth : document.body.clientWidth;
						var methodChoice = windowWidth <= this.mobileWidth ? "add" : "remove";
						this.classList[methodChoice]("mobile");
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
					key: 'fetchData',
					value: function fetchData() {
						this.services.buildService(this);
						this.services.loadData(this).then((function (data) {
							this.data = data;
						}).bind(this));
					}
				}, {
					key: 'mapDataToTable',
					value: function mapDataToTable(data) {
						if (Array.isArray(data)) {
							this.data = data;
							this.originalData = JSON.parse(JSON.stringify(data));
							this.buildColsAndRows();
							this.addEventListener("columnWidth", this.updateWidths.bind(this));
						} else {
							this.originalData = [];
							this.data = [];
							console.log('VoyaTable::fetchData() - Invalid table data.');
						}
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
							row.voyaTable = this;
							row.columns = this.columns;
							row.borders = this.borders;
							row.theme = this.theme;
							row.idx = idx;
							row.rowAlternating = this.rowAlternating;
							row.rowData = rec;
							return row;
						}).bind(this));
						this.template.addRows(this);
						this.template.handleTableScrolling(this);
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
							col.colIndex = idx;
							col.siblings = this.columns;
							col.colAmount = colAmount;
							col.flexWidth = flexWidth;
							col.data = this.data;
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
					key: 'addResizeListener',
					value: function addResizeListener() {
						this._resizeListener = this.updateMobileView.bind(this);
						window.addEventListener("resize", this._resizeListener);
					}
				}, {
					key: 'removeResizeListener',
					value: function removeResizeListener() {
						window.removeEventListener("resize", this._resizeListener);
					}
				}, {
					key: 'addTooltipListeners',
					value: function addTooltipListeners() {
						this.addEventListener('voya-tooltip:open', this.pauseScroll.bind(this));
						this.addEventListener('voya-tooltip:close', this.resumeScroll.bind(this));
					}
				}, {
					key: 'pauseScroll',
					value: function pauseScroll() {
						this.classList.add('voya-table--pause-scroll');
					}
				}, {
					key: 'resumeScroll',
					value: function resumeScroll() {
						this.classList.remove('voya-table--pause-scroll');
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
			})(NativeHTMLElement);

			document.registerElement('voya-table', VoyaTable);
		}
	};
});
$__System.register('12', ['10', '13', '14', 'c', 'd', 'b'], function (_export) {
    var _classCallCheck, _createClass, closeTooltips, _get, _inherits, NativeHTMLElement, VoyaTooltipBackdrop;

    return {
        setters: [function (_2) {
            _classCallCheck = _2['default'];
        }, function (_) {
            _createClass = _['default'];
        }, function (_3) {
            closeTooltips = _3.closeTooltips;
        }, function (_c) {
            _get = _c['default'];
        }, function (_d) {
            _inherits = _d['default'];
        }, function (_b) {
            NativeHTMLElement = _b.NativeHTMLElement;
        }],
        execute: function () {
            'use strict';

            VoyaTooltipBackdrop = (function (_NativeHTMLElement) {
                _inherits(VoyaTooltipBackdrop, _NativeHTMLElement);

                function VoyaTooltipBackdrop() {
                    _classCallCheck(this, VoyaTooltipBackdrop);

                    _get(Object.getPrototypeOf(VoyaTooltipBackdrop.prototype), 'constructor', this).apply(this, arguments);
                }

                _createClass(VoyaTooltipBackdrop, [{
                    key: 'createdCallback',
                    value: function createdCallback() {
                        this.addEventListener('click', function () {
                            closeTooltips();
                        });
                    }
                }]);

                return VoyaTooltipBackdrop;
            })(NativeHTMLElement);

            document.registerElement('voya-tooltip-backdrop', VoyaTooltipBackdrop);
        }
    };
});
$__System.register('14', ['9'], function (_export) {
	var _Array$from;

	function closeTooltips(scope, elToStayOpen) {
		if (scope === undefined) scope = document;

		_Array$from(scope.querySelectorAll('voya-tooltip')).forEach(function (ttEl) {
			if (typeof ttEl.close === 'function' && elToStayOpen !== ttEl) {
				ttEl.close();
			}
		});
	}

	function isTouch() {
		return 'ontouchstart' in window || navigator.MaxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
	}

	//convert input to an array of elements

	function getElementArray() {
		var selOrEl = arguments.length <= 0 || arguments[0] === undefined ? '' : arguments[0];

		return typeof selOrEl === 'string' ? _Array$from(document.querySelectorAll(selOrEl)) : Array.isArray(selOrEl) ? selOrEl : selOrEl ? [selOrEl] : [];
	}

	//convert input to a string ending with 'px';

	function px() {
		var value = arguments.length <= 0 || arguments[0] === undefined ? 0 : arguments[0];

		value = String(value);
		return value.indexOf('px') !== -1 ? value : value + 'px';
	}

	return {
		setters: [function (_) {
			_Array$from = _['default'];
		}],
		execute: function () {
			'use strict';

			_export('closeTooltips', closeTooltips);

			_export('isTouch', isTouch);

			_export('getElementArray', getElementArray);

			_export('px', px);
		}
	};
});
$__System.register('15', ['14'], function (_export) {

    //TODO: remove all jQuery dependencies for sizing

    'use strict';

    var getElementArray, px, ARROW_HEIGHT, positions;

    _export('positionTooltip', positionTooltip);

    function positionTooltip(el) {
        el.positionArray = el.position.split(' ');
        updatePosition(el);
    }

    function resetPosition(el) {
        //initially set styles to auto to help determine natural size
        el.style.left = el.style.bottom = el.style.top = el.style.right = 'auto';
        //reset inline width styles
        el.style.removeProperty('min-width');
        el.style.removeProperty('max-width');
        el.style.removeProperty('width');

        if (el.minWidth) {
            el.style.minWidth = el.minWidth;
        }

        if (el.maxWidth) {
            el.style.maxWidth = el.maxWidth;
        }
    }

    function updatePosition(el) {
        var pd = getPositioningData(el);
        if (el.isMobile) {
            updateMobilePosition(el, pd);
        } else {
            updateDesktopPosition(el, pd);
        }
    }

    function getPositioningData(el) {
        var target = getElementArray(el.target)[0];
        var $target = $(target);
        var $relativeParent = $(el.offsetParent);
        var $boundingParent = $(getElementArray(el.boundingParent)[0]);

        var bpOffset = $boundingParent.offset();
        var rpOffset = $relativeParent.offset();
        var targetOffset = $target.offset();
        //let targetRpOffset = $(target.offsetParent).offset();

        var bpPosData = {
            height: $boundingParent.outerHeight(),
            width: $boundingParent.outerWidth(),
            top: bpOffset.top,
            left: bpOffset.left,
            // fixing browser inconsistency (FF vs Chrome) in $('body').scrollTop() value
            scrollTop: $boundingParent[0].tagName.toLowerCase() === 'body' ? $(window).scrollTop() : $boundingParent.scrollTop()
        };

        var rpPosData = {
            top: rpOffset.top,
            left: rpOffset.left,
            height: $relativeParent.outerHeight(),
            width: $relativeParent.outerWidth(),
            scrollTop: $relativeParent.scrollTop()
        };

        var targetPosData = {
            height: $target.outerHeight(),
            width: $target.outerWidth(),
            top: targetOffset.top,
            left: targetOffset.left,
            relativeTop: targetOffset.top - rpPosData.top + rpPosData.scrollTop,
            relativeLeft: targetOffset.left - rpPosData.left
        };

        //trueWidth is only used to calc max space available
        //TODO: try to make more clear
        targetPosData.trueWidth = targetPosData.width;
        //if we are wanting to position the tooltip in the center of the element
        //then fudge the dimensions/position of the element to account for this
        if (el.pointToCenter) {
            targetPosData.top = targetPosData.top + targetPosData.height / 2;
            targetPosData.left = targetPosData.left + targetPosData.width / 2;
            targetPosData.relativeTop = targetPosData.relativeTop + targetPosData.height / 2;
            targetPosData.relativeLeft = targetPosData.relativeLeft + targetPosData.width / 2;
            targetPosData.height = 1;
            targetPosData.width = 1;
        }

        targetPosData.bottom = targetPosData.top + targetPosData.height;
        targetPosData.right = targetPosData.left + targetPosData.width;

        var out = {
            $target: $target,
            $relativeParent: $relativeParent,
            $boundingParent: $boundingParent,
            bpOffset: bpOffset,
            rpOffset: rpOffset,
            targetOffset: targetOffset,
            bpPosData: bpPosData,
            rpPosData: rpPosData,
            targetPosData: targetPosData
        };
        updateTipPosData(el, out);
        return out;
    }

    //called often to update the tooltip position data for new calculations
    function updateTipPosData(el, pd) {
        pd.tipPosData = {
            height: $(el).outerHeight(),
            width: $(el).outerWidth()
        };
    }

    function updateMobilePosition(el, pd) {
        var maxWidth = pd.bpPosData.width - el.mobileGutters * 2; // 10px of padding on both sides
        var positionTop = true;
        var arrowLeft = pd.targetPosData.left - pd.rpPosData.left - el.mobileGutters + pd.bpPosData.left + pd.targetPosData.width / 2 - ARROW_HEIGHT;
        var ttTop = undefined;

        resetPosition(el);

        // hardset left align
        el.style.left = px(el.mobileGutters - pd.rpPosData.left + pd.bpPosData.left);
        el.style.minWidth = px(maxWidth);
        el.style.maxWidth = px(maxWidth);
        updateTipPosData(el, pd);

        if (pd.targetPosData.top - pd.rpPosData.top < pd.tipPosData.height || el.positionArray[0].includes('bottom')) {
            positionTop = false;
            ttTop = pd.targetPosData.relativeTop + pd.targetPosData.height + ARROW_HEIGHT;
        } else {
            ttTop = pd.targetPosData.relativeTop - pd.tipPosData.height - ARROW_HEIGHT;
        }

        el.style.top = px(ttTop);

        el.mobileArrowEl.style.left = px(arrowLeft);
        positions.forEach(function (pos) {
            el.classList.remove(pos);
        });
        el.mobileArrowEl.classList[!positionTop ? 'add' : 'remove']('voya-tooltip__variable-position-arrow--bottom');
    }

    function updateDesktopPosition(el, pd) {
        var positionResults = undefined;
        var isLastChance = false;

        for (var i = 0; i < el.positionArray.length; i++) {
            isLastChance = i == el.positionArray.length - 1;
            positionResults = tryToolTipPosition(el, el.positionArray[i], pd, isLastChance);
            if (positionResults.fitConflicts.none) {
                break;
            }
        }

        //if fitConflicts remain, make a best guess where tooltip will best be displayed
        if (!positionResults.fitConflicts.none && !el.positionFixed) {
            if (positionResults.fitConflicts.top) {
                positionResults = tryToolTipPosition(el, 'bottom', pd, true);
            } else if (positionResults.fitConflicts.bottom) {
                positionResults = tryToolTipPosition(el, 'top', pd, true);
                //special check for top conflicts...bottom conflicts are preferrable
                if (positionResults.fitConflicts.top) {
                    positionResults = tryToolTipPosition(el, 'bottom', pd, true);
                }
            } else if (positionResults.fitConflicts.right) {
                positionResults = tryToolTipPosition(el, 'left', pd, true);
            } else if (positionResults.fitConflicts.left) {
                positionResults = tryToolTipPosition(el, 'right', pd, true);
            }
        }

        //applies the correct arrow
        positions.forEach(function (pos) {
            el.classList.remove(pos);
        });
        el.classList.add(positionResults.position);

        //setting the final positioning styles
        if (positionResults.position == "top-justifiedRight") {
            el.style.right = px(positionResults.coords.right);
            el.style.bottom = px(positionResults.coords.bottom);
        } else if (positionResults.position.substring(0, 3) == "top") {
            el.style.left = px(positionResults.coords.left);
            el.style.bottom = px(positionResults.coords.bottom);
        } else if (positionResults.position.indexOf("justifiedRight") != -1) {
            el.style.right = px(positionResults.coords.right);
            el.style.top = px(positionResults.coords.top);
        } else {
            el.style.left = px(positionResults.coords.left);
            el.style.top = px(positionResults.coords.top);
        }

        //refresh tipPosData as it might have changed during the above calculations
        //bake width into the tooltip at this point so that our positioning desires are respected
        updateTipPosData(el, pd);
        el.style.width = px(pd.tipPosData.width);
    }

    function tryToolTipPosition(el, position, pd, isLastChance) {

        var fitConflicts = undefined;
        var coords = {
            top: "",
            left: "",
            bottom: "",
            right: ""
        };

        var positionMaxWidth = undefined;
        var tipPosData = undefined;
        var offsetParent = undefined;

        resetPosition(el);

        //NOTE: Top and justifiedRight are special cases because the width adjustments of the tooltip could
        //cause it to be taller or skinnier than the dimensions we performed calculations with,
        //and that could cause the tooltip to not lineup with or cover the target.
        //So for conflict checking we always use top and left, but for
        //positioning we sometimes use bottom and right.  In edge cases, this will result in part of
        //the tooltip being off the screen but that is better than it covering the target because
        //sometimes the browser just won't show the tooltip in that case.
        //
        //also, justified positioning is generally more likely to succeed, so it is used as fallbacks when conflicts still exist
        switch (position) {
            case "right":
                el.style.width = px(getPositionMaxWidth(el, 'right', pd));
                updateTipPosData(el, pd);
                coords.left = pd.targetPosData.relativeLeft + pd.targetPosData.width + ARROW_HEIGHT;
                coords.top = pd.targetPosData.relativeTop + pd.targetPosData.height / 2 - pd.tipPosData.height / 2;
                fitConflicts = getFitConflicts(el, coords, pd);
                if (isLastChance && fitConflicts.top && !el.positionFixed) {
                    position = "right-justifiedTop";
                } else if (isLastChance && fitConflicts.bottom && !el.positionFixed) {
                    position = "right-justifiedBottom";
                }
                break;
            case "bottom":
                el.style.width = px(getPositionMaxWidth(el, 'bottom', pd));
                updateTipPosData(el, pd);
                coords.left = pd.targetPosData.relativeLeft + pd.targetPosData.width / 2 - pd.tipPosData.width / 2;
                coords.top = pd.targetPosData.relativeTop + pd.targetPosData.height + ARROW_HEIGHT;
                fitConflicts = getFitConflicts(el, coords, pd);
                if (isLastChance && fitConflicts.left && !el.positionFixed) {
                    position = "bottom-justifiedLeft";
                } else if (isLastChance && fitConflicts.right && !el.positionFixed) {
                    position = "bottom-justifiedRight";
                }
                break;
            case "left":
                el.style.width = px(getPositionMaxWidth(el, 'left', pd));
                updateTipPosData(el, pd);
                coords.left = pd.targetPosData.relativeLeft - pd.tipPosData.width - ARROW_HEIGHT;
                coords.top = pd.targetPosData.relativeTop + pd.targetPosData.height / 2 - pd.tipPosData.height / 2;
                fitConflicts = getFitConflicts(el, coords, pd);
                if (isLastChance && fitConflicts.top && !el.positionFixed) {
                    position = "left-justifiedTop";
                } else if (isLastChance && fitConflicts.bottom && !el.positionFixed) {
                    position = "left-justifiedBottom";
                }
                break;
            case "top":
                el.style.width = px(getPositionMaxWidth(el, 'top', pd));
                updateTipPosData(el, pd);
                coords.left = pd.targetPosData.relativeLeft + pd.targetPosData.width / 2 - pd.tipPosData.width / 2;
                coords.top = pd.targetPosData.relativeTop - pd.tipPosData.height - ARROW_HEIGHT;
                coords.bottom = pd.rpPosData.height - (pd.targetPosData.relativeTop - ARROW_HEIGHT);

                fitConflicts = getFitConflicts(el, coords, pd);
                if (isLastChance && fitConflicts.left && !el.positionFixed) {
                    position = "top-justifiedLeft";
                } else if (isLastChance && fitConflicts.right && !el.positionFixed) {
                    //position = "top-justifiedRight"; most difficult position to calculate....needs more though
                    position = "top";
                }
                break;
        } //end switch()

        switch (position) {
            case "right-justifiedTop":
                el.style.width = px(getPositionMaxWidth(el, 'right', pd));
                updateTipPosData(el, pd);
                coords.left = pd.targetPosData.relativeLeft + (pd.targetPosData.width + ARROW_HEIGHT);
                coords.top = pd.targetPosData.relativeTop;
                break;
            case "right-justifiedBottom":
                el.style.width = px(getPositionMaxWidth(el, 'right', pd));
                updateTipPosData(el, pd);
                coords.left = pd.targetPosData.relativeLeft + pd.targetPosData.width + ARROW_HEIGHT;
                //            coords.top  = pd.targetPosData.relativeTop + pd.targetPosData.height - pd.tipPosData.height;
                coords.top = pd.targetPosData.relativeTop + (pd.targetPosData.height - pd.tipPosData.height);
                break;
            case "bottom-justifiedLeft":
                el.style.width = px(getPositionMaxWidth(el, 'bottom', pd));
                updateTipPosData(el, pd);
                coords.left = pd.targetPosData.relativeLeft;
                coords.top = pd.targetPosData.relativeTop + pd.targetPosData.height + ARROW_HEIGHT;
                break;
            case "bottom-justifiedRight":
                el.style.width = px(getPositionMaxWidth(el, 'bottom', pd));
                updateTipPosData(el, pd);
                coords.left = pd.targetPosData.relativeLeft + pd.targetPosData.width - pd.tipPosData.width;
                //coords.right = $(el.boundingContainer).width() - (pd.targetPosData.relativeLeft + pd.targetPosData.width);
                coords.right = pd.rpPosData.width - (pd.targetPosData.relativeLeft + pd.targetPosData.width);
                coords.top = pd.targetPosData.relativeTop + pd.targetPosData.height + ARROW_HEIGHT;
                break;
            case "left-justifiedTop":
                el.style.width = px(getPositionMaxWidth(el, 'left', pd));
                updateTipPosData(el, pd);
                coords.left = pd.targetPosData.relativeLeft - pd.tipPosData.width - ARROW_HEIGHT;
                coords.top = pd.targetPosData.relativeTop;
                break;
            case "left-justifiedBottom":
                el.style.width = px(getPositionMaxWidth(el, 'left', pd));
                updateTipPosData(el, pd);
                coords.left = pd.targetPosData.relativeLeft - pd.tipPosData.width - ARROW_HEIGHT;
                coords.top = pd.targetPosData.relativeTop + (pd.targetPosData.height - pd.tipPosData.height);
                break;
            case "top-justifiedLeft":
                el.style.width = px(getPositionMaxWidth(el, 'top', pd));
                updateTipPosData(el, pd);
                coords.left = pd.targetPosData.relativeLeft;
                coords.top = pd.targetPosData.relativeTop - pd.tipPosData.height - ARROW_HEIGHT;
                coords.bottom = pd.rpPosData.height - (pd.targetPosData.relativeTop - ARROW_HEIGHT);
                break;
        } //end switch()

        fitConflicts = getFitConflicts(el, coords, pd);

        return { position: position, coords: coords, fitConflicts: fitConflicts };
    } //end tryToolTipPosition()

    //calculate the conflicts without actually rendering the tooltip
    //coords holds the values for where the tooltip would be positioned relative to its offsetParent
    function getFitConflicts(el, coords, pd) {
        var fitConflicts = {
            none: false,
            x: false,
            y: false,
            top: false,
            right: false,
            bottom: false,
            left: false
        };

        if (coords.top + pd.rpPosData.top < pd.bpPosData.top + pd.bpPosData.scrollTop + el.scrollTopOffset) fitConflicts.top = true;
        if (coords.left + pd.rpPosData.left < pd.bpPosData.left) fitConflicts.left = true;
        if (coords.top + pd.tipPosData.height > pd.bpPosData.top + pd.bpPosData.height + pd.bpPosData.scrollTop) fitConflicts.bottom = true;
        if (coords.left + pd.tipPosData.width > pd.bpPosData.width) fitConflicts.right = true;

        fitConflicts.x = fitConflicts.left || fitConflicts.right;
        fitConflicts.y = fitConflicts.top || fitConflicts.bottom;
        fitConflicts.anyConflicts = fitConflicts.x || fitConflicts.y;
        fitConflicts.none = !(fitConflicts.x || fitConflicts.y);

        return fitConflicts;
    } //end getFitConflicts()

    //get the max width possible at the current position considering the bounding container
    function getPositionMaxWidth(el, position, pd) {
        var positionMaxWidth = undefined;
        var rightTargetWidth = undefined;
        var desiredDimensions = getDesiredDimensions(el);

        switch (position) {
            case 'top':
            case 'bottom':
                var leftToMiddleOfEl = pd.targetPosData.left - pd.bpPosData.left + pd.targetPosData.width / 2;
                var rightToMiddleOfEl = pd.bpPosData.width - pd.targetPosData.left + pd.targetPosData.width / 2;
                positionMaxWidth = leftToMiddleOfEl < rightToMiddleOfEl ? leftToMiddleOfEl * 2 : rightToMiddleOfEl * 2;
                break;
            case 'right':
                rightTargetWidth = el.pointToCenter ? pd.targetPosData.trueWidth / 2 : pd.targetPosData.width;
                positionMaxWidth = pd.bpPosData.width - (pd.targetPosData.left + rightTargetWidth + ARROW_HEIGHT);
                break;
            case 'left':
                positionMaxWidth = pd.targetPosData.left - (pd.bpPosData.left + ARROW_HEIGHT);
        }

        positionMaxWidth = parseInt(positionMaxWidth - 5); //small buffer

        if (positionMaxWidth > desiredDimensions.minWidth && positionMaxWidth < desiredDimensions.maxWidth) {
            return positionMaxWidth;
        } else if (positionMaxWidth < desiredDimensions.minWidth) {
            return desiredDimensions.minWidth;
        } else {
            return desiredDimensions.maxWidth;
        }
    }

    //a way of using both CSS rules or custom properties
    function getDesiredDimensions(el) {
        var computedStyle = window.getComputedStyle(el);

        return {
            minWidth: parseInt(el.minWidth !== null ? el.minWidth : computedStyle.minWidth),
            maxWidth: parseInt(el.maxWidth !== null ? el.maxWidth : computedStyle.maxWidth)
        };
    }
    return {
        setters: [function (_) {
            getElementArray = _.getElementArray;
            px = _.px;
        }],
        execute: function () {
            ARROW_HEIGHT = 10;
            positions = ['top',
            //no top-justifiedLeft on purpose, its too hard
            'top-justifiedRight', 'right', 'right-justifiedTop', 'right-justifiedBottom', 'bottom', 'bottom-justifiedLeft', 'bottom-justifiedRight', 'left', 'left-justifiedTop', 'left-justifiedBottom'];
            ;;
        }
    };
});
$__System.register('16', ['9', '15'], function (_export) {
    var _Array$from, positionTooltip, themes;

    function render(el) {
        if (!el.innerText.trim()) return; //don't render empty tooltip
        renderBackdrop(el);
        updateActive(el);
        if (!el.active) return;

        renderCloseIcon(el);
        updateThemes(el);
        renderMobileArrow(el);
        positionTooltip(el);
    }

    function updateActive(el) {
        el.classList[el.active ? 'add' : 'remove']('voya-tooltip--active');
    }

    function updateThemes(el) {
        themes.forEach(function (theme) {
            el.classList[el.theme.includes(theme) ? 'add' : 'remove']('voya-tooltip--' + theme + '-theme');
        });
    }

    function renderBackdrop(el) {
        _Array$from(document.querySelectorAll('voya-tooltip-backdrop')).forEach(function (bdEl) {
            bdEl.parentNode.removeChild(bdEl);
        });

        if (el.active && el.closeOn === 'outsideClick' && el._currentEventType === 'click') {
            var backdropEl = document.createElement('voya-tooltip-backdrop');
            el.parentNode.insertBefore(backdropEl, el);
        }
    }

    function renderCloseIcon(el) {
        var iconEl = el.querySelector('.voya-tooltip__close-target');

        if (el.closeOn === 'closeIcon' && !iconEl) {
            iconEl = document.createElement('div');
            iconEl.classList.add('voya-tooltip__close-target');
            iconEl.innerHTML = '<i class="fa fa-times"></i>';
            el.appendChild(iconEl);
        } else if (el.closeOn !== 'closeIcon' && iconEl) {
            iconEl.parentNode.removeChild(iconEl);
        }

        el.classList[el.closeOn === 'closeIcon' ? 'add' : 'remove']('voya-tooltip--has-close-icon');
    }

    function renderMobileArrow(el) {
        var arrowEl = el.querySelector('.voya-tooltip__variable-position-arrow');

        if (el.isMobile && !arrowEl) {
            arrowEl = document.createElement('div');
            arrowEl.classList.add('voya-tooltip__variable-position-arrow');
            el.appendChild(arrowEl);
        } else if (!el.isMobile && arrowEl) {
            arrowEl.parentNode.removeChild(arrowEl);
        }
    }

    return {
        setters: [function (_) {
            _Array$from = _['default'];
        }, function (_2) {
            positionTooltip = _2.positionTooltip;
        }],
        execute: function () {
            'use strict';

            _export('render', render);

            _export('renderMobileArrow', renderMobileArrow);

            themes = ['square', 'error'];
        }
    };
});
$__System.registerDynamic("17", [], true, function(req, exports, module) {
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

$__System.registerDynamic("18", ["17"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var Delegate = req('17');
  module.exports = function(root) {
    return new Delegate(root);
  };
  module.exports.Delegate = Delegate;
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("19", ["18"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = req('18');
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("1a", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = Date.now || now;
  function now() {
    return new Date().getTime();
  }
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("1b", ["1a"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = req('1a');
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("1c", ["1b"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var now = req('1b');
  module.exports = function debounce(func, wait, immediate) {
    var timeout,
        args,
        context,
        timestamp,
        result;
    if (null == wait)
      wait = 100;
    function later() {
      var last = now() - timestamp;
      if (last < wait && last > 0) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          if (!timeout)
            context = args = null;
        }
      }
    }
    ;
    return function debounced() {
      context = this;
      args = arguments;
      timestamp = now();
      var callNow = immediate && !timeout;
      if (!timeout)
        timeout = setTimeout(later, wait);
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }
      return result;
    };
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("1d", ["1c"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = req('1c');
  global.define = __define;
  return module.exports;
});

$__System.register('1e', ['10', '11', '12', '14', '16', '19', 'c', 'd', 'e', 'f', '1d', 'b'], function (_export) {
    var _classCallCheck, property, ui, closeTooltips, isTouch, getElementArray, render, delegate, _get, _inherits, _defineDecoratedPropertyDescriptor, _createDecoratedClass, debounce, NativeHTMLElement, voyaTooltipData, VoyaTooltip;

    return {
        setters: [function (_) {
            _classCallCheck = _['default'];
        }, function (_3) {
            property = _3.property;
            ui = _3.ui;
        }, function (_6) {}, function (_5) {
            closeTooltips = _5.closeTooltips;
            isTouch = _5.isTouch;
            getElementArray = _5.getElementArray;
        }, function (_4) {
            render = _4.render;
        }, function (_2) {
            delegate = _2['default'];
        }, function (_c) {
            _get = _c['default'];
        }, function (_d) {
            _inherits = _d['default'];
        }, function (_e) {
            _defineDecoratedPropertyDescriptor = _e['default'];
        }, function (_f) {
            _createDecoratedClass = _f['default'];
        }, function (_d2) {
            debounce = _d2['default'];
        }, function (_b) {
            NativeHTMLElement = _b.NativeHTMLElement;
        }],
        execute: function () {
            'use strict';

            voyaTooltipData = {
                activeTooltip: null,
                isTouch: isTouch()
            };

            VoyaTooltip = (function (_NativeHTMLElement) {
                var _instanceInitializers = {};

                _inherits(VoyaTooltip, _NativeHTMLElement);

                function VoyaTooltip() {
                    _classCallCheck(this, VoyaTooltip);

                    _get(Object.getPrototypeOf(VoyaTooltip.prototype), 'constructor', this).apply(this, arguments);

                    _defineDecoratedPropertyDescriptor(this, 'active', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'target', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'targetSelector', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'boundingParent', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'boundingSelector', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'position', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'pointToCenter', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'positionFixed', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'openOn', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'closeOn', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'theme', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'mobileGutters', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'mobileWidth', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'isMobile', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'scrollTopOffset', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'minWidth', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'maxWidth', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'mobileArrowEl', _instanceInitializers);
                }

                _createDecoratedClass(VoyaTooltip, [{
                    key: 'createdCallback',
                    value: function createdCallback() {
                        this._hasBeenAttached = false;
                        this._hoverTimeout = null;
                        this._currentEventType = 'click';
                        this.normalizeDeprecatedAttributes();
                        this.moveInlineStylesToProperties();
                        this.createEventListeners();
                    }
                }, {
                    key: 'createEventListeners',
                    value: function createEventListeners() {
                        this._targetClickListener = (function () {
                            this.active = true;
                        }).bind(this);

                        this._clickListener = function (e) {
                            e.stopPropagation();
                        };

                        this._closeIconClickListener = (function () {
                            this.close();
                        }).bind(this);

                        this._mouseoverListener = (function () {
                            if (voyaTooltipData.activeTooltip && voyaTooltipData.activeTooltip !== this) {
                                voyaTooltipData.activeTooltip.close();
                            }

                            clearTimeout(this._hoverTimeout);

                            if (!this.active) {
                                this.open("hover");
                            }
                        }).bind(this);

                        this._mouseleaveListener = (function () {
                            clearTimeout(this._hoverTimeout);
                            this._hoverTimeout = setTimeout((function () {
                                this.close();
                            }).bind(this), 200);
                        }).bind(this);

                        this._resizeListener = debounce(this.updateDimensions.bind(this), 200);
                    }
                }, {
                    key: 'attachedCallback',
                    value: function attachedCallback() {
                        this.normalizeDeprecatedAttributes();
                        this.updateEventListeners();
                        this.updateDimensions();
                        if (this._hasBeenAttached || this.active) {
                            this.update(true);
                        }
                        this._hasBeenAttached = true;
                    }
                }, {
                    key: 'detachedCallback',
                    value: function detachedCallback() {
                        clearTimeout(this._hoverTimeout);
                        this.removeEventListeners();
                    }

                    //implementing api for backwards compatibility
                }, {
                    key: 'api',
                    value: function api(method, options) {
                        this[method](options);
                    }
                }, {
                    key: 'open',
                    value: function open() {
                        var eventType = arguments.length <= 0 || arguments[0] === undefined ? 'click' : arguments[0];

                        this._currentEventType = eventType;
                        if (this.active) return;
                        closeTooltips(document, this); //
                        this.active = true;
                    }
                }, {
                    key: 'close',
                    value: function close() {
                        clearTimeout(this._hoverTimeout);
                        this.active = false;
                    }
                }, {
                    key: 'toggle',
                    value: function toggle() {
                        this.active = !this.active;
                    }
                }, {
                    key: 'update',
                    value: function update(dispatchEvents) {
                        this.normalizeDeprecatedAttributes();
                        render(this);
                        if (this.active) {
                            voyaTooltipData.activeTooltip = this;
                        }

                        if (dispatchEvents) {
                            this.dispatchEvent(new CustomEvent('voya-tooltip:' + (this.active ? 'open' : 'close'), { bubbles: true }));
                        }
                    }
                }, {
                    key: 'updateDimensions',
                    value: function updateDimensions() {
                        var isMobile = this.isMobile;
                        this.isMobile = window.innerWidth <= this.mobileWidth;
                        //doing a little extra to work to make sure tooltip only
                        //rerenders once after screen resize
                        if (isMobile === this.isMobile && this.active) {
                            this.update();
                        }
                    }
                }, {
                    key: 'removeEventListeners',
                    value: function removeEventListeners(target) {
                        getElementArray(target || this.target).forEach((function (targetEl) {
                            targetEl.removeEventListener('click', this._targetClickListener);
                            targetEl.removeEventListener('mouseover', this._mouseoverListener);
                            targetEl.removeEventListener('mouseleave', this._mouseleaveListener);
                        }).bind(this));

                        this.removeEventListener('mouseover', this._mouseoverListener);
                        this.removeEventListener('mouseleave', this._mouseleaveListener);
                        this.removeEventListener('click', this._clickListener);
                        delegate(this).off('click', '.voya-tooltip__close-target', this._closeIconClickListener);
                        window.removeEventListener('resize', this._resizeListener);
                    }
                }, {
                    key: 'addEventListeners',
                    value: function addEventListeners() {
                        if (this.openOn == "click" || voyaTooltipData.isTouch) {
                            getElementArray(this.target).forEach((function (targetEl) {
                                targetEl.addEventListener('click', this._targetClickListener);
                            }).bind(this));
                        }

                        if (this.openOn == "hover") {
                            getElementArray(this.target).forEach((function (targetEl) {
                                targetEl.addEventListener('mouseover', this._mouseoverListener);
                                targetEl.addEventListener('mouseleave', this._mouseleaveListener);
                            }).bind(this));
                            this.addEventListener('mouseover', this._mouseoverListener);
                            this.addEventListener('mouseleave', this._mouseleaveListener);
                        }

                        this.addEventListener('click', this._clickListener);
                        delegate(this).on('click', '.voya-tooltip__close-target', this._closeIconClickListener);
                        window.addEventListener('resize', this._resizeListener);
                    }
                }, {
                    key: 'updateEventListeners',
                    value: function updateEventListeners(oldTarget) {

                        if (oldTarget) {
                            this.removeEventListeners(oldTarget);
                        }

                        if (this.target) {
                            this.addEventListeners();
                        };
                    }

                    //remove with next major release
                }, {
                    key: 'normalizeDeprecatedAttributes',
                    value: function normalizeDeprecatedAttributes() {
                        if (this.targetSelector) {
                            this.target = this.targetSelector;
                        }
                        if (this.boundingSelector) {
                            this.boundingParent = this.boundingSelector;
                        }
                    }

                    //certain inline styles get overwritten, so move them to properties instead
                }, {
                    key: 'moveInlineStylesToProperties',
                    value: function moveInlineStylesToProperties() {
                        if (this.style.minWidth) {
                            this.minWidth = this.style.minWidth;
                        };
                        if (this.style.maxWidth) {
                            this.maxWidth = this.style.maxWidth;
                        }
                    }
                }, {
                    key: 'propertyChangedCallback',
                    value: function propertyChangedCallback(prop, oldValue, newValue) {
                        if (!this._hasBeenAttached) return;

                        if (prop === 'target') {
                            this.updateEventListeners(oldValue);
                        } else {
                            this.update(prop === 'active');
                        }
                    }
                }, {
                    key: 'active',
                    decorators: [property({ type: 'boolean' })],
                    initializer: function initializer() {
                        return false;
                    },
                    enumerable: true
                }, {
                    key: 'target',
                    decorators: [property],
                    //string or element
                    initializer: function initializer() {
                        return '';
                    },
                    enumerable: true
                }, {
                    key: 'targetSelector',
                    decorators: [property],
                    //string, deprecated, remove with next major release
                    initializer: function initializer() {
                        return null;
                    },
                    enumerable: true
                }, {
                    key: 'boundingParent',
                    decorators: [property],
                    //string or element
                    initializer: function initializer() {
                        return 'body';
                    },
                    enumerable: true
                }, {
                    key: 'boundingSelector',
                    decorators: [property],
                    //string, deprecated, remove with next major release
                    initializer: function initializer() {
                        return null;
                    },
                    enumerable: true
                }, {
                    key: 'position',
                    decorators: [property],
                    initializer: function initializer() {
                        return 'top';
                    },
                    enumerable: true
                }, {
                    key: 'pointToCenter',
                    decorators: [property({ type: 'boolean' })],
                    initializer: function initializer() {
                        return false;
                    },
                    enumerable: true
                }, {
                    key: 'positionFixed',
                    decorators: [property({ type: 'boolean' })],
                    initializer: function initializer() {
                        return false;
                    },
                    enumerable: true
                }, {
                    key: 'openOn',
                    decorators: [property],
                    initializer: function initializer() {
                        return 'hover';
                    },
                    enumerable: true
                }, {
                    key: 'closeOn',
                    decorators: [property],
                    initializer: function initializer() {
                        return 'outsideClick';
                    },
                    //'closeIcon'       

                    enumerable: true
                }, {
                    key: 'theme',
                    decorators: [property],
                    initializer: function initializer() {
                        return 'round';
                    },
                    //square, error

                    enumerable: true
                }, {
                    key: 'mobileGutters',
                    decorators: [property({ type: 'integer' })],
                    initializer: function initializer() {
                        return 10;
                    },
                    enumerable: true
                }, {
                    key: 'mobileWidth',
                    decorators: [property({ type: 'integer' })],
                    initializer: function initializer() {
                        return 617;
                    },
                    enumerable: true
                }, {
                    key: 'isMobile',
                    decorators: [property({ type: 'boolean' })],
                    initializer: function initializer() {
                        return false;
                    },
                    enumerable: true
                }, {
                    key: 'scrollTopOffset',
                    decorators: [property({ type: 'integer' })],
                    initializer: function initializer() {
                        return 0;
                    },
                    enumerable: true
                }, {
                    key: 'minWidth',
                    decorators: [property],
                    initializer: function initializer() {
                        return null;
                    },
                    //deprecated, calculated from CSS, remove with next major release

                    enumerable: true
                }, {
                    key: 'maxWidth',
                    decorators: [property],
                    initializer: function initializer() {
                        return null;
                    },
                    //deprecated, calculated from CSS, remove with next major release

                    enumerable: true
                }, {
                    key: 'mobileArrowEl',
                    decorators: [ui({ selector: '.voya-tooltip__variable-position-arrow' })],
                    initializer: null,
                    enumerable: true
                }], null, _instanceInitializers);

                return VoyaTooltip;
            })(NativeHTMLElement);

            document.registerElement('voya-tooltip', VoyaTooltip);

            _export('closeTooltips', closeTooltips);
        }
    };
});
$__System.register("1f", ["1e"], function (_export) {
  "use strict";

  return {
    setters: [function (_e) {
      for (var _key in _e) {
        if (_key !== "default") _export(_key, _e[_key]);
      }

      _export("default", _e["default"]);
    }],
    execute: function () {}
  };
});
$__System.register("20", [], function (_export) {
    "use strict";

    _export("tooltipTemplate", tooltipTemplate);

    function tooltipTemplate() {
        function render(el) {
            return "<div class=\"tooltipButton fa fa-question\"></div>";
        }
        function insertVoyaTooltip(el) {
            el.voyaTableContainer.appendChild(el.voyaTooltip);
        }
        function removeVoyaTooltip(el) {
            el.voyaTableContainer.removeChild(el.voyaTooltip);
        }
        return {
            render: render,
            insertVoyaTooltip: insertVoyaTooltip,
            removeVoyaTooltip: removeVoyaTooltip
        };
    }

    return {
        setters: [],
        execute: function () {}
    };
});
$__System.register('21', ['10', '11', '20', 'c', 'd', 'e', 'f', 'b', '1f'], function (_export) {
    var _classCallCheck, property, nullable, tooltipTemplate, _get, _inherits, _defineDecoratedPropertyDescriptor, _createDecoratedClass, NativeHTMLElement, Tooltip;

    return {
        setters: [function (_) {
            _classCallCheck = _['default'];
        }, function (_3) {
            property = _3.property;
            nullable = _3.nullable;
        }, function (_2) {
            tooltipTemplate = _2.tooltipTemplate;
        }, function (_c) {
            _get = _c['default'];
        }, function (_d) {
            _inherits = _d['default'];
        }, function (_e) {
            _defineDecoratedPropertyDescriptor = _e['default'];
        }, function (_f) {
            _createDecoratedClass = _f['default'];
        }, function (_b) {
            NativeHTMLElement = _b.NativeHTMLElement;
        }, function (_f2) {}],
        execute: function () {
            'use strict';

            Tooltip = (function (_NativeHTMLElement) {
                var _instanceInitializers = {};

                _inherits(Tooltip, _NativeHTMLElement);

                function Tooltip() {
                    _classCallCheck(this, Tooltip);

                    _get(Object.getPrototypeOf(Tooltip.prototype), 'constructor', this).apply(this, arguments);

                    _defineDecoratedPropertyDescriptor(this, 'text', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'template', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'active', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'voyaTooltip', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'rowIdx', _instanceInitializers);
                }

                _createDecoratedClass(Tooltip, [{
                    key: 'createdCallback',
                    value: function createdCallback() {
                        this.template = tooltipTemplate();
                        this.innerHTML = this.template.render(this);
                        this.active = false;
                    }
                }, {
                    key: 'attachedCallback',
                    value: function attachedCallback() {
                        this.voyaTooltip = document.createElement('voya-tooltip');
                        this.voyaTooltip.innerHTML = this.text;
                        this.voyaTooltip.target = this.querySelector('.tooltipButton');
                        this.voyaTooltip.openOn = "click";
                        this.voyaTooltip.position = "top bottom right left";
                        this.template.insertVoyaTooltip(this);
                    }
                }, {
                    key: 'detactedCallback',
                    value: function detactedCallback() {
                        this.template.removeVoyaTooltip(this);
                    }
                }, {
                    key: 'text',
                    decorators: [nullable, property],
                    initializer: null,
                    enumerable: true
                }, {
                    key: 'template',
                    decorators: [nullable, property],
                    initializer: null,
                    enumerable: true
                }, {
                    key: 'active',
                    decorators: [property],
                    initializer: null,
                    enumerable: true
                }, {
                    key: 'voyaTooltip',
                    decorators: [property],
                    initializer: null,
                    enumerable: true
                }, {
                    key: 'rowIdx',
                    decorators: [property],
                    initializer: null,
                    enumerable: true
                }], null, _instanceInitializers);

                return Tooltip;
            })(NativeHTMLElement);

            _export('Tooltip', Tooltip);

            document.registerElement('voya-table-tooltip', Tooltip);
        }
    };
});
$__System.registerDynamic("13", ["22"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var _Object$defineProperty = req('22')["default"];
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

$__System.register('23', ['10', '13'], function (_export) {
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
                            },
                            pwebCurrency: function pwebCurrency(item) {
                                return isNaN(item) || item === '' ? item : '$ ' + parseFloat(item).toString().replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
                            },
                            number: function number(item) {
                                return isNaN(item) || item === '' ? item : parseFloat(item).toString().replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
                            },
                            percent: function percent(item) {
                                return isNaN(item) || item === '' ? item : parseFloat(item) + "%";
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
$__System.registerDynamic("24", ["25"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var ITERATOR = req('25')('iterator'),
      SAFE_CLOSING = false;
  try {
    var riter = [7][ITERATOR]();
    riter['return'] = function() {
      SAFE_CLOSING = true;
    };
    Array.from(riter, function() {
      throw 2;
    });
  } catch (e) {}
  module.exports = function(exec, skipClosing) {
    if (!skipClosing && !SAFE_CLOSING)
      return false;
    var safe = false;
    try {
      var arr = [7],
          iter = arr[ITERATOR]();
      iter.next = function() {
        return {done: safe = true};
      };
      arr[ITERATOR] = function() {
        return iter;
      };
      exec(arr);
    } catch (e) {}
    return safe;
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("26", ["27", "28", "29", "2a", "2b", "2c", "2d", "24"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var ctx = req('27'),
      $export = req('28'),
      toObject = req('29'),
      call = req('2a'),
      isArrayIter = req('2b'),
      toLength = req('2c'),
      getIterFn = req('2d');
  $export($export.S + $export.F * !req('24')(function(iter) {
    Array.from(iter);
  }), 'Array', {from: function from(arrayLike) {
      var O = toObject(arrayLike),
          C = typeof this == 'function' ? this : Array,
          $$ = arguments,
          $$len = $$.length,
          mapfn = $$len > 1 ? $$[1] : undefined,
          mapping = mapfn !== undefined,
          index = 0,
          iterFn = getIterFn(O),
          length,
          result,
          step,
          iterator;
      if (mapping)
        mapfn = ctx(mapfn, $$len > 2 ? $$[2] : undefined, 2);
      if (iterFn != undefined && !(C == Array && isArrayIter(iterFn))) {
        for (iterator = iterFn.call(O), result = new C; !(step = iterator.next()).done; index++) {
          result[index] = mapping ? call(iterator, mapfn, [step.value, index], true) : step.value;
        }
      } else {
        length = toLength(O.length);
        for (result = new C(length); length > index; index++) {
          result[index] = mapping ? mapfn(O[index], index) : O[index];
        }
      }
      result.length = index;
      return result;
    }});
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("2e", ["2f", "26", "30"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  req('2f');
  req('26');
  module.exports = req('30').Array.from;
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("9", ["2e"], true, function(req, exports, module) {
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

$__System.register('31', ['5', '9', '23'], function (_export) {
    var _Object$keys, _Array$from, format, RENDERING_TEMPLATE_FACTORY;

    function templateRenderingFactory() {
        function redrawRepeaterTemplate() {
            var cell = createTempNode(this.cellTemplate),
                repeatableTemplate = undefined;
            _Object$keys(this.cellData).forEach((function (property, idx) {
                var template = extractRepeaterElement(cell, property).outerHTML;
                var finalTemplate = mergeDataToTemplate(this, this.cellData[property], template);
                repeatableTemplate = mergeTemplate(template, mergeRepeaters(finalTemplate), repeatableTemplate);
            }).bind(this));
            var s = document.createElement('span');
            s.innerHTML = repeatableTemplate;
            var p = document.createElement('span');
            p.innerHTML = this.cellTemplate;
            var child = p.querySelector("[repeat-on]");
            child.parentNode.replaceChild(s, child);
            return p.innerHTML;
        }

        function redrawSingleTemplate() {
            return redrawTemplate(this, this.cellData, this.cellTemplate);
        }

        function createTempNode(cell) {
            var dom = document.createElement('span');
            dom.innerHTML = cell;
            return dom;
        }

        function mergeTemplate(orig, arrayOfTemplates, template) {
            var t = template;
            (function merge(orig, arrayOfTemplates, template) {
                arrayOfTemplates.forEach(function (item, idx) {
                    if (Array.isArray(item)) return merge(orig, item, template);
                    t = !t ? item : t.replace(orig, item);
                });
            })(orig, arrayOfTemplates, template);
            return t;
        }

        function extractRepeaterElement(cell, property) {
            return _Array$from(cell.children).map(function (childCell) {
                if (!childCell.attributes.getNamedItem('repeat-on') || childCell.attributes.getNamedItem('repeat-on').value != property) {
                    return extractRepeaterElement(childCell, property);
                } else {
                    return childCell;
                }
            }).filter(function (item) {
                return item;
            })[0];
        }

        function mergeDataToTemplate(cell, cellData, template) {
            return cellData.map(function (item) {
                if (Array.isArray(item)) return mergeDataToTemplate(cell, item, template);else return redrawTemplate(cell, item, template);
            }).filter(function (item) {
                return item;
            });
        }

        function mergeRepeaters(newTemplate, finalOutput) {
            return newTemplate.map(function (item, idx) {
                if (Array.isArray(item)) return mergeRepeaters(item, finalOutput);else {
                    finalOutput = finalOutput ? finalOutput + item : item;
                    return idx == newTemplate.length - 1 ? finalOutput : null;
                }
            }).filter(function (item) {
                return item;
            });
        }

        function redrawTemplate(cell, cellData, template) {
            _Object$keys(cellData).forEach((function (item) {
                var replace = new RegExp("\(\\#\\{{(\\^?)" + item + "\\}}\)");
                if (cell.dataFormat && cellData[item] !== "") {
                    var formatting = cell.dataFormat.indexOf("{") != -1 ? (function () {
                        return _Object$keys(JSON.parse(cell.dataFormat)).map(function (format) {
                            var formatItems = JSON.parse(cell.dataFormat)[format],
                                formatType = undefined;
                            if (Array.isArray(formatItems)) formatItems.forEach(function (formatItem) {
                                if (formatItem == item) formatType = format;
                            });else formatType = formatItems === item ? format : null;
                            return formatType;
                        })[0];
                    }).bind(cell)() : cell.dataFormat;
                    if (formatting) cellData[item] = format.getFormat()[formatting](cellData[item]);
                }
                template = template.replace(replace, cellData[item]);
            }).bind(cell));
            return template;
        }
        return {
            redrawRepeaterTemplate: redrawRepeaterTemplate,
            redrawSingleTemplate: redrawSingleTemplate
        };
    }
    return {
        setters: [function (_) {
            _Object$keys = _['default'];
        }, function (_2) {
            _Array$from = _2['default'];
        }, function (_3) {
            format = _3.format;
        }],
        execute: function () {
            //methods for marrying up template to data
            'use strict';

            RENDERING_TEMPLATE_FACTORY = templateRenderingFactory();

            _export('RENDERING_TEMPLATE_FACTORY', RENDERING_TEMPLATE_FACTORY);
        }
    };
});
$__System.register('7', ['32'], function (_export) {
    var _Object$assign, arr;

    function getNestedData(searchString, object) {
        object = Array.isArray(object) ? object : _Object$assign({}, object);
        var value = searchString.split('.').map(function (property, idx) {
            //if data is Array based
            if (Array.isArray(object[property]) && idx == searchString.split('.').length - 1) {
                return object[property];
            } else if (Array.isArray(object[property]) && idx < searchString.split('.').length - 1) {
                return object[property].map(function (data) {
                    return getNestedData(searchString.split('.').slice(idx + 1).join("."), data);
                });
            }
            //if data is Object based
            if (typeof object[property] === 'object' && idx < searchString.split('.').length - 1) {
                return getNestedData(searchString.split('.').slice(idx + 1).join("."), object[property]);
            }
            //if data is key value pair
            object[property] = object[property] == 0 ? "" + object[property] : object[property];
            if (typeof object[property] !== 'object' && object[property]) {
                return object[property];
            }
        }).filter(function (data) {
            return data;
        })[0];
        return value;
    }

    function getArrayData(searchString, objects) {
        return objects.map(function (item) {
            if (Array.isArray(item)) return getArrayData(searchString, item);else {
                var _ret = (function () {
                    var o = {},
                        m = searchString.map(function (property, idx) {
                        o[property] = getNestedData(property, item);
                        return idx == searchString.length - 1 ? o : null;
                    }).filter(function (item) {
                        return item;
                    });
                    return {
                        v: m[0]
                    };
                })();

                if (typeof _ret === 'object') return _ret.v;
            };
        });
    }

    function sortData(e, data) {
        e.columnName = e.columnName.toLowerCase();
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
        setters: [function (_) {
            _Object$assign = _['default'];
        }],
        execute: function () {
            'use strict';

            _export('getNestedData', getNestedData);

            _export('getArrayData', getArrayData);

            _export('sortData', sortData);

            arr = [];
        }
    };
});
$__System.register('33', ['7'], function (_export) {
    //methods are for traverseing and reassembling data to cell requirements
    'use strict';

    var getNestedData, getArrayData, MAP_DATA_FACTORY;
    function mapDataFactory() {
        function mapObjectData() {
            var c = {};
            this.cellTemplate.split('#').slice(1).map(function (dataProperty) {
                return dataProperty.substring(2, dataProperty.indexOf("}}"));
            }).forEach((function (property) {
                var primaryValue = property.indexOf('^') != -1 ? property.substring(1) : null;
                if (primaryValue) {
                    this.cellName = this.cellName === primaryValue ? primaryValue + "^" : primaryValue;
                }
                c[primaryValue ? primaryValue : property] = primaryValue ? this.cellName : property;
            }).bind(this));
            for (var property in c) {
                c[property] = c[property].charAt(c[property].length - 1) != "^" ? getNestedData(property, this.cellValue) : this.cellValue;
                c[property] = c[property] == null ? "" : c[property];
            }
            return c;
        }

        function mapRepeaterData() {
            var arrayObject = {};
            assembleRepeatable(this).forEach((function (repeatObject) {
                // traversing through data model to obatin values and correct node level for nested lpoops and mapping back row layout
                arrayObject[repeatObject.repeater] = getArrayData(repeatObject.childProps, getNestedData(repeatObject.repeater, this.cellValue));
            }).bind(this));
            return arrayObject;
        }

        function assembleRepeatable(cell) {
            return cell.cellTemplate.split('repeat-on').slice(1).map((function (dataProperty) {
                var arrayProp = dataProperty.substring(5, dataProperty.indexOf("}}"));
                var childProps = dataProperty.split('#').slice(1).map(function (childProperty) {
                    return childProperty.substring(2, childProperty.indexOf("}}"));
                }).filter(function (childProp) {
                    return childProp != arrayProp;
                });
                cell.cellTemplate = cell.cellTemplate.replace(/(repeat-on=('|")#{{((\w|\.)+)}}('|"))/, "repeat-on='" + arrayProp + "'");
                return { repeater: arrayProp, childProps: childProps };
            }).bind(cell));
        }
        return {
            mapObjectData: mapObjectData,
            mapRepeaterData: mapRepeaterData
        };
    }
    return {
        setters: [function (_) {
            getNestedData = _.getNestedData;
            getArrayData = _.getArrayData;
        }],
        execute: function () {
            MAP_DATA_FACTORY = mapDataFactory();

            _export('MAP_DATA_FACTORY', MAP_DATA_FACTORY);
        }
    };
});
$__System.register("34", [], function (_export) {
    "use strict";

    _export("VoyaCellTemplate", VoyaCellTemplate);

    function VoyaCellTemplate() {
        function render(el) {
            //if(el.cellIndex === el.cellAmount){el.style.width = "auto"}
            el.style.width = isNaN(el.width) ? el.width : el.width + "%";
            var content = el.cellTemplate ? el.cellTemplate : el.cellValue;
            var method = !el.mobile ? "add" : "remove";
            el.classList[method]("non-mobile");
            var method2 = !el.label ? "add" : "remove";
            el.classList[method2]("non-label");
            return "<div class=\"voya-cell " + el.cellName + "\"><span class=\"label\">" + el.label + ": </span>" + content + "</div>";
        }
        function insertToolTip(el) {
            if (!el.querySelector('.voya-cell') || !el.tooltip) return;
            el.querySelector('.voya-cell').appendChild(el.tooltip);
        }
        return {
            render: render,
            insertToolTip: insertToolTip
        };
    }

    return {
        setters: [],
        execute: function () {}
    };
});
$__System.register('35', ['10', '11', '21', '23', '31', '33', '34', 'c', 'd', 'e', 'f', 'b'], function (_export) {
    var _classCallCheck, property, nullable, Tooltip, format, RENDERING_TEMPLATE_FACTORY, MAP_DATA_FACTORY, VoyaCellTemplate, _get, _inherits, _defineDecoratedPropertyDescriptor, _createDecoratedClass, NativeHTMLElement, VoyaCell;

    return {
        setters: [function (_) {
            _classCallCheck = _['default'];
        }, function (_3) {
            property = _3.property;
            nullable = _3.nullable;
        }, function (_7) {
            Tooltip = _7.Tooltip;
        }, function (_6) {
            format = _6.format;
        }, function (_5) {
            RENDERING_TEMPLATE_FACTORY = _5.RENDERING_TEMPLATE_FACTORY;
        }, function (_4) {
            MAP_DATA_FACTORY = _4.MAP_DATA_FACTORY;
        }, function (_2) {
            VoyaCellTemplate = _2.VoyaCellTemplate;
        }, function (_c) {
            _get = _c['default'];
        }, function (_d) {
            _inherits = _d['default'];
        }, function (_e) {
            _defineDecoratedPropertyDescriptor = _e['default'];
        }, function (_f) {
            _createDecoratedClass = _f['default'];
        }, function (_b) {
            NativeHTMLElement = _b.NativeHTMLElement;
        }],
        execute: function () {
            'use strict';

            VoyaCell = (function (_NativeHTMLElement) {
                var _instanceInitializers = {};

                _inherits(VoyaCell, _NativeHTMLElement);

                function VoyaCell() {
                    _classCallCheck(this, VoyaCell);

                    _get(Object.getPrototypeOf(VoyaCell.prototype), 'constructor', this).apply(this, arguments);

                    _defineDecoratedPropertyDescriptor(this, 'cellName', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'cellViewName', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'cellIndex', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'cellAmount', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'width', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'template', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'cellValue', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'cellData', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'cellTemplate', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'dataFormat', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'mobile', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'label', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'ttContent', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'rowIdx', _instanceInitializers);

                    _defineDecoratedPropertyDescriptor(this, 'isRepeater', _instanceInitializers);
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
                        if (oldValue === newValue) return;
                        this.innerHTML = this.template.render(this);
                        if (this.ttContent) this.addToolTip();
                    }
                }, {
                    key: 'hasRepeater',
                    value: function hasRepeater() {
                        this.isRepeater = this.cellTemplate.indexOf('repeat-on') != -1;
                    }
                }, {
                    key: 'renderCellTemplate',
                    value: function renderCellTemplate() {
                        this.hasRepeater();
                        this.mapData = this.isRepeater ? MAP_DATA_FACTORY.mapRepeaterData : MAP_DATA_FACTORY.mapObjectData;
                        this.redrawCell = this.isRepeater ? RENDERING_TEMPLATE_FACTORY.redrawRepeaterTemplate : RENDERING_TEMPLATE_FACTORY.redrawSingleTemplate;
                        this.cellData = this.mapData();
                        this.cellTemplate = this.redrawCell();
                    }
                }, {
                    key: 'addToolTip',
                    value: function addToolTip() {
                        this.tooltip = document.createElement('voya-table-tooltip');
                        this.tooltip.voyaTableContainer = this.voyaTable.querySelector('.deep-ui-voya-table');
                        this.tooltip.text = this.ttContent;
                        this.tooltip.rowIdx = this.rowIdx;
                        this.template.insertToolTip(this);
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
                    key: 'cellIndex',
                    decorators: [property],
                    initializer: null,
                    enumerable: true
                }, {
                    key: 'cellAmount',
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
                }, {
                    key: 'ttContent',
                    decorators: [nullable, property],
                    initializer: null,
                    enumerable: true
                }, {
                    key: 'rowIdx',
                    decorators: [property],
                    initializer: null,
                    enumerable: true
                }, {
                    key: 'isRepeater',
                    decorators: [property],
                    initializer: null,
                    enumerable: true
                }], null, _instanceInitializers);

                return VoyaCell;
            })(NativeHTMLElement);

            _export('VoyaCell', VoyaCell);

            document.registerElement('voya-cell', VoyaCell);
        }
    };
});
$__System.register("36", [], function (_export) {
    "use strict";

    _export("VoyaRowTemplate", VoyaRowTemplate);

    function VoyaRowTemplate() {
        function addCells(el) {
            el.innerHTML = "";
            el.cells.forEach(function (cell) {
                el.appendChild(cell);
            });
        }
        function updateRowTheme(el) {
            if (el.rowAlternating) {
                ["odd", "even"].forEach(function (CSSclass) {
                    el.classList.remove(CSSclass);
                });
                el.classList.add(el.rowAlternating);
            }
            if (el.borders) {
                ["vertical", "horizontal", "none"].forEach(function (CSSclass) {
                    el.classList.remove(CSSclass);
                });
                el.classList.add(el.borders);
            }
            if (el.theme) {
                ["orange", "white"].forEach(function (CSSclass) {
                    el.classList.remove(CSSclass);
                });
                el.classList.add(el.theme);
            }
        }
        return {
            addCells: addCells,
            updateRowTheme: updateRowTheme
        };
    }

    return {
        setters: [],
        execute: function () {}
    };
});
$__System.register('37', ['10', '11', '36', 'c', 'd', 'e', 'f', 'b'], function (_export) {
    var _classCallCheck, property, nullable, VoyaRowTemplate, _get, _inherits, _defineDecoratedPropertyDescriptor, _createDecoratedClass, NativeHTMLElement, VoyaRow;

    return {
        setters: [function (_) {
            _classCallCheck = _['default'];
        }, function (_3) {
            property = _3.property;
            nullable = _3.nullable;
        }, function (_2) {
            VoyaRowTemplate = _2.VoyaRowTemplate;
        }, function (_c) {
            _get = _c['default'];
        }, function (_d) {
            _inherits = _d['default'];
        }, function (_e) {
            _defineDecoratedPropertyDescriptor = _e['default'];
        }, function (_f) {
            _createDecoratedClass = _f['default'];
        }, function (_b) {
            NativeHTMLElement = _b.NativeHTMLElement;
        }],
        execute: function () {
            'use strict';

            VoyaRow = (function (_NativeHTMLElement) {
                var _instanceInitializers = {};

                _inherits(VoyaRow, _NativeHTMLElement);

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
                        this.rowAlternating;
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
                        this.cells = this.columns.map((function (col, idx) {
                            var cell = document.createElement("voya-cell");
                            cell.voyaTable = this.voyaTable;
                            cell.cellViewName = col.name;
                            cell.cellName = col.name;
                            cell.mobile = col.mobile;
                            cell.cellIndex = col.colIndex;
                            cell.cellAmount = col.colAmount;
                            cell.rowIdx = this.idx;
                            cell.label = col.mobileLabel ? col.colLabel : null;
                            cell.cellValue = col.name ? this.rowData[cell.cellName] : this.rowData;
                            cell.cellTemplate = col.cellTemplate ? col.cellTemplate : null;
                            cell.dataFormat = col.dataFormat ? col.dataFormat : null;
                            cell.ttContent = col.tooltip ? this.rowData[col.tooltip] : null;
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
            })(NativeHTMLElement);

            _export('VoyaRow', VoyaRow);

            document.registerElement('voya-row', VoyaRow);
        }
    };
});
$__System.register('38', ['10', '11', 'e', 'f'], function (_export) {
    var _classCallCheck, property, nullable, _defineDecoratedPropertyDescriptor, _createDecoratedClass, Filter;

    return {
        setters: [function (_) {
            _classCallCheck = _['default'];
        }, function (_2) {
            property = _2.property;
            nullable = _2.nullable;
        }, function (_e) {
            _defineDecoratedPropertyDescriptor = _e['default'];
        }, function (_f) {
            _createDecoratedClass = _f['default'];
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
$__System.register("39", ["10", "11", "e", "f"], function (_export) {
    var _classCallCheck, property, nullable, _defineDecoratedPropertyDescriptor, _createDecoratedClass, SORT_TYPE, Sort;

    return {
        setters: [function (_) {
            _classCallCheck = _["default"];
        }, function (_2) {
            property = _2.property;
            nullable = _2.nullable;
        }, function (_e) {
            _defineDecoratedPropertyDescriptor = _e["default"];
        }, function (_f) {
            _createDecoratedClass = _f["default"];
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
                        this.event.columnName = this.col.name || this.col.colLabel;
                        this.event.colIndex = this.col.colIndex;
                        this.button.dispatchEvent(this.event);
                    }
                }, {
                    key: "removeActiveSort",
                    value: function removeActiveSort(e) {
                        if (this.col.colLabel === e.columnName || this.col.name === e.columnName) return;
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
$__System.register('3a', ['32'], function (_export) {
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
            case 'truthyBoolean':
                // if the value is "false", will be false, otherwise the truthy value
                if (typeof value === 'string') {
                    return value.toLowerCase() === 'false' ? false : !!value;
                }
                break;
            case 'boolean':
                // if the attribute is present, with no value, it will evaluate to true
                // the attribute will only be false if it's value is "false" (case-insensitive)
                if (typeof value === 'string') {
                    return !/false/i.test(value);
                }
                break;
            case 'object':
                if (typeof value === 'string' && value !== '') {
                    value = JSON.parse(value);
                }
                break;
            case 'integer':
                if (typeof value === 'string') {
                    value = parseInt(value);
                }
                break;
            case 'float':
                if (typeof value === 'string') {
                    value = parseFloat(value);
                }
                break;
            case 'string':
                if (typeof value === 'undefined') {
                    value = '';
                } else if (typeof value !== 'string') {
                    value = value.toString();
                }
                break;
            default:
            //do nothing
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
$__System.registerDynamic("3b", ["28"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $export = req('28');
  $export($export.S, 'Number', {isNaN: function isNaN(number) {
      return number != number;
    }});
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("3c", ["3b", "30"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  req('3b');
  module.exports = req('30').Number.isNaN;
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("3d", ["3c"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": req('3c'),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("3e", ["3f", "40"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = req('3f'),
      toIObject = req('40'),
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

$__System.registerDynamic("41", ["28", "3e"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $export = req('28'),
      $entries = req('3e')(true);
  $export($export.S, 'Object', {entries: function entries(it) {
      return $entries(it);
    }});
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("42", ["41", "30"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  req('41');
  module.exports = req('30').Object.entries;
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("43", ["42"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": req('42'),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("44", ["3f", "29", "45", "46"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = req('3f'),
      toObject = req('29'),
      IObject = req('45');
  module.exports = req('46')(function() {
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

$__System.registerDynamic("47", ["28", "44"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $export = req('28');
  $export($export.S + $export.F, 'Object', {assign: req('44')});
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("48", ["47", "30"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  req('47');
  module.exports = req('30').Object.assign;
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("32", ["48"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": req('48'),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("49", ["4a", "25", "4b", "30"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var classof = req('4a'),
      ITERATOR = req('25')('iterator'),
      Iterators = req('4b');
  module.exports = req('30').isIterable = function(it) {
    var O = Object(it);
    return O[ITERATOR] !== undefined || '@@iterator' in O || Iterators.hasOwnProperty(classof(O));
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("4c", ["4d", "2f", "49"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  req('4d');
  req('2f');
  module.exports = req('49');
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("4e", ["4c"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": req('4c'),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("4f", ["50", "2d", "30"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var anObject = req('50'),
      get = req('2d');
  module.exports = req('30').getIterator = function(it) {
    var iterFn = get(it);
    if (typeof iterFn != 'function')
      throw TypeError(it + ' is not iterable!');
    return anObject(iterFn.call(it));
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("51", ["52", "53"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var toInteger = req('52'),
      defined = req('53');
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

$__System.registerDynamic("2f", ["51", "54"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var $at = req('51')(true);
  req('54')(String, 'String', function(iterated) {
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

$__System.registerDynamic("55", ["4d", "2f", "4f"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  req('4d');
  req('2f');
  module.exports = req('4f');
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("56", ["55"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": req('55'),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("57", ["56", "4e"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var _getIterator = req('56')["default"];
  var _isIterable = req('4e')["default"];
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

$__System.register('11', ['32', '43', '56', '57', '58', '59', '3d', '3a'], function (_export) {
    var _Object$assign, _Object$entries, _getIterator, _slicedToArray, camelcase, decamelize, _Number$isNaN, decorator, coerce, property, nullable, ui;

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

                        if (!recoverValueFromProperty(this, prop, type)) {
                            setValueFromAttribute(this, prop, type);
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

    function setValueFromAttribute(instance, prop, type) {
        var attr = decamelize(prop, '-');
        var value = instance.getAttribute(attr);
        if (value != undefined) {
            instance._properties[prop] = coerce(value, type);
        }
    }

    /**
     * Compensate for possibility of props being set before createdCallback is fired.
     * CustomElement polyfill doesn't enhance element immediately like native.
     * This is most noticable when using multiple levels of prototypal inheritance.
     */
    function recoverValueFromProperty(instance, prop, type) {
        var recovered = false;
        if (instance.hasOwnProperty(prop) && instance._properties[prop] !== instance[prop]) {
            if (_Number$isNaN(instance._properties[prop]) && _Number$isNaN(instance[prop])) return;
            var recoveredValue = instance[prop];
            delete instance[prop];
            instance._properties[prop] = coerce(recoveredValue, type);
            //console.log('voya-component-utils: compensating for property being set on ' +
            //    this.tagName.toLowerCase() + ' before createdCallback has fired.');
        }
        return recovered;
    }
    return {
        setters: [function (_2) {
            _Object$assign = _2['default'];
        }, function (_4) {
            _Object$entries = _4['default'];
        }, function (_3) {
            _getIterator = _3['default'];
        }, function (_) {
            _slicedToArray = _['default'];
        }, function (_5) {
            camelcase = _5['default'];
        }, function (_6) {
            decamelize = _6['default'];
        }, function (_d) {
            _Number$isNaN = _d['default'];
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

                    properties[key] = value = descriptor.type ? coerce(value, descriptor.type === 'boolean' ? 'truthyBoolean' : descriptor.type) : value;

                    if (typeof this.propertyChangedCallback === 'function' && oldValue !== value) {
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
$__System.registerDynamic("5a", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  "format cjs";
  try {
    new window.CustomEvent("test");
  } catch (e) {
    var CustomEvent = function(event, params) {
      var evt;
      params = params || {
        bubbles: false,
        cancelable: false,
        detail: undefined
      };
      evt = document.createEvent("CustomEvent");
      evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
      return evt;
    };
    CustomEvent.prototype = window.Event.prototype;
    window.CustomEvent = CustomEvent;
  }
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("5b", ["5a"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = req('5a');
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("5c", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  function polyfill() {
    var w = window;
    var d = w.document;
    if (w.onfocusin === undefined) {
      d.addEventListener('focus', addPolyfill, true);
      d.addEventListener('blur', addPolyfill, true);
      d.addEventListener('focusin', removePolyfill, true);
      d.addEventListener('focusout', removePolyfill, true);
    }
    function addPolyfill(e) {
      var type = e.type === 'focus' ? 'focusin' : 'focusout';
      var event = new window.CustomEvent(type, {
        bubbles: true,
        cancelable: false
      });
      event.c1Generated = true;
      e.target.dispatchEvent(event);
    }
    function removePolyfill(e) {
      if (!e.c1Generated) {
        d.removeEventListener('focus', addPolyfill, true);
        d.removeEventListener('blur', addPolyfill, true);
        d.removeEventListener('focusin', removePolyfill, true);
        d.removeEventListener('focusout', removePolyfill, true);
      }
      setTimeout(function() {
        d.removeEventListener('focusin', removePolyfill, true);
        d.removeEventListener('focusout', removePolyfill, true);
      });
    }
  }
  module.exports = {polyfill: polyfill};
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("5d", ["5c"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = req('5c');
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("5e", [], true, function(req, exports, module) {
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

$__System.registerDynamic("59", ["5e"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = req('5e');
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("5f", [], true, function(req, exports, module) {
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

$__System.registerDynamic("58", ["5f"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = req('5f');
  global.define = __define;
  return module.exports;
});

$__System.register('60', ['5', '58', '59', '5d', '5b'], function (_export) {
    var _Object$keys, camelcase, decamelize, focusIn;

    //dom4's classList polyfill was blowing up firefox, expose this method to use instead of classList.add
    //01/26/2016 - consider deprecating this function, replace or fix polyfill instead

    function addClass(el, new_class) {
        if ((" " + el.className + " ").indexOf(" " + new_class + " ") === -1) {
            el.className += " " + new_class;
        }

        return el;
    }

    //01/26/2016 - consider deprecating this function, replace or fix polyfill instead

    function removeClass(el, oldClass) {
        var newClassName = "";
        var i;
        var classes = el.className.split(" ");
        for (i = 0; i < classes.length; i++) {
            if (classes[i] !== oldClass) {
                newClassName += classes[i] + " ";
            }
        }
        if (newClassName.charAt(newClassName.length - 1) === " ") {
            newClassName = newClassName.substring(0, newClassName.length - 1);
        }

        el.className = newClassName;
    }

    function getConfig(id) {
        return window.voya._componentConfigs[id];
    }

    //this simple implementation can be swapped out later with promises as needed

    function setConfig(id, config) {
        var el;
        window.voya._componentConfigs[id] = config;
        el = document.getElementById(id);

        //set config on element if it is ready to accept it,
        //otherwise, it is up to the element to ask for it when it is ready
        if (el && el.api) {
            el.api('setConfig', config);
        }
    }

    //01/26/2016 - consider deprecating this function once most components
    //are written to utilize properties over attributes

    function setAttributes(el, attrs) {
        for (var attr in attrs) {
            if (attrs.hasOwnProperty(attr) && attrs[attr] !== false) {
                el.setAttribute(attr, attrs[attr]);
            }
        }
    }

    function dispatchEvent(element, eventName) {
        element.dispatchEvent(new CustomEvent(eventName, { bubbles: true }));
    }

    function getCSSTransitionEvent(element) {
        var transitions = {
            transition: 'transitionend',
            OTransition: 'oTransitionEnd',
            MozTransition: 'transitionend',
            WebkitTransition: 'webkitTransitionEnd'
        };
        var cssEvents = _Object$keys(transitions).map(function (f) {
            if (element.style[f] != undefined) return transitions[f];
        });
        return cssEvents.filter(Boolean);
    }

    function warnIfBeingExtended(instance, aConstructor) {
        if (instance.constructor !== aConstructor) {
            console.warn(aConstructor.name + ' is not intended to be extended.  Future changes will break ' + instance.constructor.name + '\'s implemention.  Don\'t do it.');
        }
    }

    //very fast way to clone as object that doesn't contain methods, only data

    function jsonClone(obj) {
        if (typeof obj !== 'object') return obj;
        return JSON.parse(JSON.stringify(obj));
    }

    return {
        setters: [function (_) {
            _Object$keys = _['default'];
        }, function (_2) {
            camelcase = _2['default'];
        }, function (_3) {
            decamelize = _3['default'];
        }, function (_d) {
            focusIn = _d['default'];
        }, function (_b) {}],
        execute: function () {
            'use strict';

            _export('addClass', addClass);

            _export('removeClass', removeClass);

            _export('getConfig', getConfig);

            _export('setConfig', setConfig);

            _export('setAttributes', setAttributes);

            _export('dispatchEvent', dispatchEvent);

            _export('getCSSTransitionEvent', getCSSTransitionEvent);

            _export('warnIfBeingExtended', warnIfBeingExtended);

            _export('jsonClone', jsonClone);

            focusIn.polyfill();

            _export('camelcase', camelcase);

            _export('decamelize', decamelize);
        }
    };
});
$__System.register('61', ['60', '62'], function (_export) {
  var addClass, removeClass, setAttributes, getConfig, setConfig, dispatchEvent, getCSSTransitionEvent, camelcase, decamelize, jsonClone, warnIfBeingExtended, _Object$create, voyaComponentUtils, NativeHTMLElement;

  function innerHTML(el, html) {
    // 'document-register-element/innerHTML' mutates document.registerElement
    // adding the innerHTML method.
    if (typeof document.registerElement.innerHTML === 'function') {
      document.registerElement.innerHTML(el, html);
    } else {
      el.innerHTML = html;
    }
  }

  function getBaseElementPrototype() {
    var element = HTMLElement || Element;
    return _Object$create(element.prototype);
  }

  function registerElement(options) {

    var tag = options.tag;
    var elementClass = options.elementClass;

    //needed for IE8, consider adding conditional check for IE8 and maybe IE9?
    //document.createElement(tag);
    //
    document.registerElement(tag, {
      prototype: elementClass.prototype
    });
  }

  return {
    setters: [function (_2) {
      addClass = _2.addClass;
      removeClass = _2.removeClass;
      setAttributes = _2.setAttributes;
      getConfig = _2.getConfig;
      setConfig = _2.setConfig;
      dispatchEvent = _2.dispatchEvent;
      getCSSTransitionEvent = _2.getCSSTransitionEvent;
      camelcase = _2.camelcase;
      decamelize = _2.decamelize;
      jsonClone = _2.jsonClone;
      warnIfBeingExtended = _2.warnIfBeingExtended;
    }, function (_) {
      _Object$create = _['default'];
    }],
    execute: function () {
      'use strict';

      voyaComponentUtils = {
        registerElement: registerElement,
        getBaseElementPrototype: getBaseElementPrototype,
        addClass: addClass,
        removeClass: removeClass,
        setAttributes: setAttributes,
        innerHTML: innerHTML,
        getConfig: getConfig,
        setConfig: setConfig,
        dispatchEvent: dispatchEvent,
        getCSSTransitionEvent: getCSSTransitionEvent,
        camelcase: camelcase,
        decamelize: decamelize,
        jsonClone: jsonClone,
        warnIfBeingExtended: warnIfBeingExtended
      };

      //a standardized element to extend for custom elements

      if (typeof HTMLElement === 'function') {
        _export('NativeHTMLElement', NativeHTMLElement = HTMLElement);
      } else if (typeof Element === 'function') {
        _export('NativeHTMLElement', NativeHTMLElement = Element);
      } else if (typeof HTMLElement === 'object') {
        _export('NativeHTMLElement', NativeHTMLElement = function () {});
        NativeHTMLElement.prototype = HTMLElement.prototype;
      } else if (typeof Element === 'object') {
        _export('NativeHTMLElement', NativeHTMLElement = function () {});
        NativeHTMLElement.prototype = Element.prototype;
      }

      //setup some methods and objects for global use
      window.voya = window.voya || {};
      window.voya._componentConfigs = window.voya._componentConfigs || {};
      window.voya.componentUtils = voyaComponentUtils;

      _export('voyaComponentUtils', voyaComponentUtils);

      _export('NativeHTMLElement', NativeHTMLElement);

      _export('camelcase', camelcase);

      _export('decamelize', decamelize);

      _export('jsonClone', jsonClone);

      _export('warnIfBeingExtended', warnIfBeingExtended);
    }
  };
});
$__System.register("b", ["61"], function (_export) {
  "use strict";

  return {
    setters: [function (_) {
      for (var _key in _) {
        if (_key !== "default") _export(_key, _[_key]);
      }

      _export("default", _["default"]);
    }],
    execute: function () {}
  };
});
$__System.register("63", [], function (_export) {
    "use strict";

    _export("VoyaColumnTemplate", VoyaColumnTemplate);

    function VoyaColumnTemplate() {
        function render(data) {
            return "<div class=\"voya-col " + data.colLabel + "\"><div class=\"label\">" + data.colLabel + "</div> <div class=\"voya-col-actions\"></div></div>";
        }
        function addButton(el, button) {
            if (el.querySelector(".voya-col-actions")) el.querySelector(".voya-col-actions").appendChild(button);
        }
        function updateTheme(el) {
            if (el.theme) {
                ["orange", "white"].forEach(function (CSSclass) {
                    el.classList.remove(CSSclass);
                });
                el.classList.add(el.theme);
            }
            if (el.borders) {
                ["vertical", "horizontal", "none"].forEach(function (CSSclass) {
                    el.classList.remove(CSSclass);
                });
                el.classList.add(el.borders);
            }
        }
        function updateColumnWidth(el) {
            if (!el.width) return;
            //if(el.colAmount==el.colIndex){el.style.width = "auto";}
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
$__System.registerDynamic("64", ["3f", "65", "28", "46", "66", "67", "68", "69", "6a", "6b", "6c"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var $ = req('3f'),
      global = req('65'),
      $export = req('28'),
      fails = req('46'),
      hide = req('66'),
      redefineAll = req('67'),
      forOf = req('68'),
      strictNew = req('69'),
      isObject = req('6a'),
      setToStringTag = req('6b'),
      DESCRIPTORS = req('6c');
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

$__System.registerDynamic("6d", ["6e"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var cof = req('6e');
  module.exports = Array.isArray || function(arg) {
    return cof(arg) == 'Array';
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("6f", ["6a", "6d", "25"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var isObject = req('6a'),
      isArray = req('6d'),
      SPECIES = req('25')('species');
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

$__System.registerDynamic("70", ["27", "45", "29", "2c", "6f"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var ctx = req('27'),
      IObject = req('45'),
      toObject = req('29'),
      toLength = req('2c'),
      asc = req('6f');
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

$__System.registerDynamic("4a", ["6e", "25"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var cof = req('6e'),
      TAG = req('25')('toStringTag'),
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

$__System.registerDynamic("2d", ["4a", "25", "4b", "30"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var classof = req('4a'),
      ITERATOR = req('25')('iterator'),
      Iterators = req('4b');
  module.exports = req('30').getIteratorMethod = function(it) {
    if (it != undefined)
      return it[ITERATOR] || it['@@iterator'] || Iterators[classof(it)];
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("52", [], true, function(req, exports, module) {
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

$__System.registerDynamic("2c", ["52"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var toInteger = req('52'),
      min = Math.min;
  module.exports = function(it) {
    return it > 0 ? min(toInteger(it), 0x1fffffffffffff) : 0;
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("2b", ["4b", "25"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var Iterators = req('4b'),
      ITERATOR = req('25')('iterator'),
      ArrayProto = Array.prototype;
  module.exports = function(it) {
    return it !== undefined && (Iterators.Array === it || ArrayProto[ITERATOR] === it);
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("2a", ["50"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var anObject = req('50');
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

$__System.registerDynamic("68", ["27", "2a", "2b", "50", "2c", "2d"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var ctx = req('27'),
      call = req('2a'),
      isArrayIter = req('2b'),
      anObject = req('50'),
      toLength = req('2c'),
      getIterFn = req('2d');
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

$__System.registerDynamic("69", [], true, function(req, exports, module) {
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

$__System.registerDynamic("67", ["71"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var redefine = req('71');
  module.exports = function(target, src) {
    for (var key in src)
      redefine(target, key, src[key]);
    return target;
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("72", ["66", "67", "50", "6a", "69", "68", "70", "73", "74"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var hide = req('66'),
      redefineAll = req('67'),
      anObject = req('50'),
      isObject = req('6a'),
      strictNew = req('69'),
      forOf = req('68'),
      createArrayMethod = req('70'),
      $has = req('73'),
      WEAK = req('74')('weak'),
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

$__System.registerDynamic("75", ["3f", "71", "72", "6a", "73", "64"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var $ = req('3f'),
      redefine = req('71'),
      weak = req('72'),
      isObject = req('6a'),
      has = req('73'),
      frozenStore = weak.frozenStore,
      WEAK = weak.WEAK,
      isExtensible = Object.isExtensible || isObject,
      tmp = {};
  var $WeakMap = req('64')('WeakMap', function(get) {
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

$__System.registerDynamic("74", [], true, function(req, exports, module) {
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

$__System.registerDynamic("76", ["65"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var global = req('65'),
      SHARED = '__core-js_shared__',
      store = global[SHARED] || (global[SHARED] = {});
  module.exports = function(key) {
    return store[key] || (store[key] = {});
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("25", ["76", "74", "65"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var store = req('76')('wks'),
      uid = req('74'),
      Symbol = req('65').Symbol;
  module.exports = function(name) {
    return store[name] || (store[name] = Symbol && Symbol[name] || (Symbol || uid)('Symbol.' + name));
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("6b", ["3f", "73", "25"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var def = req('3f').setDesc,
      has = req('73'),
      TAG = req('25')('toStringTag');
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

$__System.registerDynamic("77", ["3f", "78", "6b", "66", "25"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var $ = req('3f'),
      descriptor = req('78'),
      setToStringTag = req('6b'),
      IteratorPrototype = {};
  req('66')(IteratorPrototype, req('25')('iterator'), function() {
    return this;
  });
  module.exports = function(Constructor, NAME, next) {
    Constructor.prototype = $.create(IteratorPrototype, {next: descriptor(1, next)});
    setToStringTag(Constructor, NAME + ' Iterator');
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("73", [], true, function(req, exports, module) {
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

$__System.registerDynamic("6c", ["46"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = !req('46')(function() {
    return Object.defineProperty({}, 'a', {get: function() {
        return 7;
      }}).a != 7;
  });
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("78", [], true, function(req, exports, module) {
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

$__System.registerDynamic("66", ["3f", "78", "6c"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = req('3f'),
      createDesc = req('78');
  module.exports = req('6c') ? function(object, key, value) {
    return $.setDesc(object, key, createDesc(1, value));
  } : function(object, key, value) {
    object[key] = value;
    return object;
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("71", ["66"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = req('66');
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("79", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = true;
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("54", ["79", "28", "71", "66", "73", "4b", "77", "6b", "3f", "25"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var LIBRARY = req('79'),
      $export = req('28'),
      redefine = req('71'),
      hide = req('66'),
      has = req('73'),
      Iterators = req('4b'),
      $iterCreate = req('77'),
      setToStringTag = req('6b'),
      getProto = req('3f').getProto,
      ITERATOR = req('25')('iterator'),
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

$__System.registerDynamic("4b", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {};
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("7a", [], true, function(req, exports, module) {
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

$__System.registerDynamic("7b", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = function() {};
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("7c", ["7b", "7a", "4b", "40", "54"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var addToUnscopables = req('7b'),
      step = req('7a'),
      Iterators = req('4b'),
      toIObject = req('40');
  module.exports = req('54')(Array, 'Array', function(iterated, kind) {
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

$__System.registerDynamic("4d", ["7c", "4b"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  req('7c');
  var Iterators = req('4b');
  Iterators.NodeList = Iterators.HTMLCollection = Iterators.Array;
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("7d", [], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  "format cjs";
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("7e", ["7d", "4d", "75", "30"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  req('7d');
  req('4d');
  req('75');
  module.exports = req('30').WeakMap;
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("7f", ["7e"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": req('7e'),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("10", [], true, function(req, exports, module) {
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

$__System.registerDynamic("f", ["22"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var _Object$defineProperty = req('22')["default"];
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

$__System.registerDynamic("80", ["3f"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = req('3f');
  module.exports = function defineProperty(it, key, desc) {
    return $.setDesc(it, key, desc);
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("22", ["80"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": req('80'),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("e", ["22"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var _Object$defineProperty = req('22')["default"];
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

$__System.registerDynamic("50", ["6a"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var isObject = req('6a');
  module.exports = function(it) {
    if (!isObject(it))
      throw TypeError(it + ' is not an object!');
    return it;
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("6a", [], true, function(req, exports, module) {
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

$__System.registerDynamic("81", ["3f", "6a", "50", "27"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var getDesc = req('3f').getDesc,
      isObject = req('6a'),
      anObject = req('50');
  var check = function(O, proto) {
    anObject(O);
    if (!isObject(proto) && proto !== null)
      throw TypeError(proto + ": can't set as prototype!");
  };
  module.exports = {
    set: Object.setPrototypeOf || ('__proto__' in {} ? function(test, buggy, set) {
      try {
        set = req('27')(Function.call, getDesc(Object.prototype, '__proto__').set, 2);
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

$__System.registerDynamic("82", ["28", "81"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $export = req('28');
  $export($export.S, 'Object', {setPrototypeOf: req('81').set});
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("83", ["82", "30"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  req('82');
  module.exports = req('30').Object.setPrototypeOf;
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("84", ["83"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": req('83'),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("85", ["3f"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = req('3f');
  module.exports = function create(P, D) {
    return $.create(P, D);
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("62", ["85"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": req('85'),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("d", ["62", "84"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var _Object$create = req('62')["default"];
  var _Object$setPrototypeOf = req('84')["default"];
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

$__System.registerDynamic("6e", [], true, function(req, exports, module) {
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

$__System.registerDynamic("45", ["6e"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var cof = req('6e');
  module.exports = Object('z').propertyIsEnumerable(0) ? Object : function(it) {
    return cof(it) == 'String' ? it.split('') : Object(it);
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("40", ["45", "53"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var IObject = req('45'),
      defined = req('53');
  module.exports = function(it) {
    return IObject(defined(it));
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("86", ["40", "87"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var toIObject = req('40');
  req('87')('getOwnPropertyDescriptor', function($getOwnPropertyDescriptor) {
    return function getOwnPropertyDescriptor(it, key) {
      return $getOwnPropertyDescriptor(toIObject(it), key);
    };
  });
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("3f", [], true, function(req, exports, module) {
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

$__System.registerDynamic("88", ["3f", "86"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $ = req('3f');
  req('86');
  module.exports = function getOwnPropertyDescriptor(it, key) {
    return $.getDesc(it, key);
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("89", ["88"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": req('88'),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("c", ["89"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var _Object$getOwnPropertyDescriptor = req('89')["default"];
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

$__System.register('8a', ['5', '10', '11', '38', '39', '63', 'c', 'd', 'e', 'f', '7f', 'b'], function (_export) {
    var _Object$keys, _classCallCheck, property, nullable, Filter, Sort, VoyaColumnTemplate, _get, _inherits, _defineDecoratedPropertyDescriptor, _createDecoratedClass, _WeakMap, NativeHTMLElement, _features, _privateProperties, VoyaColumn;

    return {
        setters: [function (_2) {
            _Object$keys = _2['default'];
        }, function (_) {
            _classCallCheck = _['default'];
        }, function (_4) {
            property = _4.property;
            nullable = _4.nullable;
        }, function (_6) {
            Filter = _6.Filter;
        }, function (_5) {
            Sort = _5.Sort;
        }, function (_3) {
            VoyaColumnTemplate = _3.VoyaColumnTemplate;
        }, function (_c) {
            _get = _c['default'];
        }, function (_d) {
            _inherits = _d['default'];
        }, function (_e) {
            _defineDecoratedPropertyDescriptor = _e['default'];
        }, function (_f) {
            _createDecoratedClass = _f['default'];
        }, function (_f2) {
            _WeakMap = _f2['default'];
        }, function (_b) {
            NativeHTMLElement = _b.NativeHTMLElement;
        }],
        execute: function () {
            'use strict';

            _features = undefined;
            _privateProperties = new _WeakMap();

            VoyaColumn = (function (_NativeHTMLElement) {
                var _instanceInitializers = {};

                _inherits(VoyaColumn, _NativeHTMLElement);

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

                    _defineDecoratedPropertyDescriptor(this, 'tooltip', _instanceInitializers);
                }

                _createDecoratedClass(VoyaColumn, [{
                    key: 'createdCallback',
                    value: function createdCallback() {
                        _features = { sort: null, filter: null };
                        _privateProperties.set(this, _features);
                        this.template = VoyaColumnTemplate();
                        this.colLabel = this.innerHTML;
                        this.name = this.name;
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
                        if (oldValue === newValue && !newValue) return;
                        if (prop == 'sort') {
                            this.assembleFeatures();
                        }
                        if (prop == "theme" || prop == "borders") {
                            this.template.updateTheme(this);
                        }
                        if (prop === "width") {
                            this.width = this.setWidth();
                            if (isNaN(this.width) || !this.data) return;
                            this.dispatchEvent(this.event);
                            this.template.updateColumnWidth(this);
                        }
                        if ((prop == "colAmount" || prop == "flexWidth") && (!this.width || isNaN(this.width))) {
                            this.width = this.setColumnFlexWidth();
                            this.template.updateColumnWidth(this);
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
                }, {
                    key: 'tooltip',
                    decorators: [property],
                    initializer: null,
                    enumerable: true
                }], null, _instanceInitializers);

                return VoyaColumn;
            })(NativeHTMLElement);

            _export('VoyaColumn', VoyaColumn);

            document.registerElement('voya-column', VoyaColumn);
        }
    };
});
$__System.register('8b', ['35', '37', '8a', 'a'], function (_export) {
  /* please keep this in specfic order */
  'use strict';

  return {
    setters: [function (_2) {}, function (_) {}, function (_a) {}, function (_a2) {}],
    execute: function () {}
  };
});
$__System.registerDynamic("46", [], true, function(req, exports, module) {
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

$__System.registerDynamic("8c", [], true, function(req, exports, module) {
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

$__System.registerDynamic("27", ["8c"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var aFunction = req('8c');
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

$__System.registerDynamic("30", [], true, function(req, exports, module) {
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

$__System.registerDynamic("65", [], true, function(req, exports, module) {
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

$__System.registerDynamic("28", ["65", "30", "27"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var global = req('65'),
      core = req('30'),
      ctx = req('27'),
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

$__System.registerDynamic("87", ["28", "30", "46"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var $export = req('28'),
      core = req('30'),
      fails = req('46');
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

$__System.registerDynamic("53", [], true, function(req, exports, module) {
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

$__System.registerDynamic("29", ["53"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var defined = req('53');
  module.exports = function(it) {
    return Object(defined(it));
  };
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("8d", ["29", "87"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  var toObject = req('29');
  req('87')('keys', function($keys) {
    return function keys(it) {
      return $keys(toObject(it));
    };
  });
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("8e", ["8d", "30"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  req('8d');
  module.exports = req('30').Object.keys;
  global.define = __define;
  return module.exports;
});

$__System.registerDynamic("5", ["8e"], true, function(req, exports, module) {
  ;
  var global = this,
      __define = global.define;
  global.define = undefined;
  module.exports = {
    "default": req('8e'),
    __esModule: true
  };
  global.define = __define;
  return module.exports;
});

$__System.register('1', ['3', '5', '19', '8b'], function (_export) {
	var _Object$keys, delegate, eventMethod;

	function appLoaded() {
		var toolbar = document.querySelector('.toolbar');
		var voyaTable = document.querySelector('voya-table');
		delegate(toolbar).on('click', "li", function (e) {
			var value = e.target.dataset.value == 'true' || e.target.dataset.value == 'false' ? JSON.parse(e.target.dataset.value) : e.target.dataset.value;
			if (e.target.dataset.property.indexOf("column") != -1) {
				var column = document.querySelectorAll("voya-column")[3];
				column[e.target.dataset.property.substring(e.target.dataset.property.indexOf(":") + 1)] = value;
				return;
			}
			if (e.target.dataset.property.indexOf("data") != -1) {
				voyaTable.data = null;
				voyaTable.data = obj;
				return;
			}
			voyaTable[e.target.dataset.property] = e.target.dataset.value.indexOf(":") != -1 ? buildValue(e) : value;
		});

		var obj = {
			"data": {
				"records": [{
					"Fname": "Bernie",
					"lname": "Madoff",
					"tooltip": "tooltip content",
					"accounts": [{ "amount": "0.25",
						"type": "checking",
						"history": [{ "month": "December", "balance": "10" }, { "month": "November", "balance": "250" }, { "month": "October", "balance": "4050" }]
					}],
					"contact": "bmadoff@gmail.com"
				}, {
					"Fname": "Pete",
					"lname": "Rose",
					"accounts": [{ "amount": "205000.25",
						"type": "checking",
						"history": [{ "month": "December", "balance": "120450" }, { "month": "November", "balance": "80250" }, { "month": "October", "balance": "40050" }]
					}, { "amount": "800500.75",
						"type": "savings",
						"history": [{ "month": "December", "balance": "20450" }, { "month": "November", "balance": "10250" }, { "month": "October", "balance": "30050" }]
					}],
					"contact": "pRose@gmail.com"
				}]
			}
		};
	}
	return {
		setters: [function (_3) {}, function (_) {
			_Object$keys = _['default'];
		}, function (_2) {
			delegate = _2['default'];
		}, function (_b) {}],
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