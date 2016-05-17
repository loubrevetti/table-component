System.config({
  baseURL: "",
  defaultJSExtensions: true,
  transpiler: "babel",
  babelOptions: {
    "optional": [
      "runtime",
      "es7.decorators",
      "es7.classProperties",
      "es7.comprehensions"
    ],
    "stage": 0
  },
  paths: {
    "github:*": "jspm_packages/github/*",
    "npm:*": "jspm_packages/npm/*",
    "voya-github:*": "jspm_packages/voya-github/*"
  },

  map: {
    "babel": "npm:babel-core@5.8.38",
    "babel-runtime": "npm:babel-runtime@5.8.38",
    "core-js": "npm:core-js@1.2.6",
    "dom-delegate": "npm:dom-delegate@2.0.3",
    "voya-base-styles": "voya-github:Voya/deep-ui-voya-base-styles@2.4.0",
    "voya-component-utils": "voya-github:Voya/deep-ui-voya-component-utils@3.2.2",
    "github:jspm/nodelibs-assert@0.1.0": {
      "assert": "npm:assert@1.3.0"
    },
    "github:jspm/nodelibs-path@0.1.0": {
      "path-browserify": "npm:path-browserify@0.0.0"
    },
    "github:jspm/nodelibs-process@0.1.2": {
      "process": "npm:process@0.11.2"
    },
    "github:jspm/nodelibs-util@0.1.0": {
      "util": "npm:util@0.10.3"
    },
    "npm:assert@1.3.0": {
      "util": "npm:util@0.10.3"
    },
    "npm:babel-runtime@5.8.38": {
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:core-js@1.2.6": {
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "path": "github:jspm/nodelibs-path@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "systemjs-json": "github:systemjs/plugin-json@0.1.1"
    },
    "npm:font-awesome@4.4.0": {
      "css": "github:systemjs/plugin-css@0.1.21"
    },
    "npm:inherits@2.0.1": {
      "util": "github:jspm/nodelibs-util@0.1.0"
    },
    "npm:path-browserify@0.0.0": {
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:process@0.11.2": {
      "assert": "github:jspm/nodelibs-assert@0.1.0"
    },
    "npm:util@0.10.3": {
      "inherits": "npm:inherits@2.0.1",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "voya-github:Voya/deep-ui-voya-base-styles@2.4.0": {
      "compass-mixins": "github:Igosuki/compass-mixins@1.0.2",
      "font-awesome": "npm:font-awesome@4.4.0"
    },
    "voya-github:Voya/deep-ui-voya-component-utils@3.2.2": {
      "camelcase": "npm:camelcase@2.1.1",
      "decamelize": "npm:decamelize@1.2.0"
    }
  }
});
