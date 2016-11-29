[1mdiff --git a/.publish b/.publish[m
[1m--- a/.publish[m
[1m+++ b/.publish[m
[36m@@ -1 +1 @@[m
[31m-Subproject commit 4cb2444cc1e21f50e6b6107a57c98dba8c9aecc3[m
[32m+[m[32mSubproject commit 4cb2444cc1e21f50e6b6107a57c98dba8c9aecc3-dirty[m
[1mdiff --git a/config.js b/config.js[m
[1mindex 7b0306e..3c5fec7 100644[m
[1m--- a/config.js[m
[1m+++ b/config.js[m
[36m@@ -22,8 +22,10 @@[m [mSystem.config({[m
     "babel-runtime": "npm:babel-runtime@5.8.38",[m
     "core-js": "npm:core-js@1.2.6",[m
     "dom-delegate": "npm:dom-delegate@2.0.3",[m
[32m+[m[32m    "font-awesome": "npm:font-awesome@4.7.0",[m
     "voya-base-styles": "voya-github:Voya/deep-ui-voya-base-styles@2.4.1",[m
     "voya-component-utils": "voya-github:Voya/deep-ui-voya-component-utils@3.4.1",[m
[32m+[m[32m    "voya-tooltip": "voya-github:Voya/deep-ui-voya-tooltip@2.8.3",[m
     "whatwg-fetch": "npm:whatwg-fetch@1.0.0",[m
     "github:jspm/nodelibs-assert@0.1.0": {[m
       "assert": "npm:assert@1.4.1"[m
[36m@@ -63,9 +65,15 @@[m [mSystem.config({[m
       "process": "github:jspm/nodelibs-process@0.1.2",[m
       "systemjs-json": "github:systemjs/plugin-json@0.1.2"[m
     },[m
[32m+[m[32m    "npm:debounce@1.0.0": {[m
[32m+[m[32m      "date-now": "npm:date-now@1.0.1"[m
[32m+[m[32m    },[m
     "npm:font-awesome@4.4.0": {[m
       "css": "github:systemjs/plugin-css@0.1.22"[m
     },[m
[32m+[m[32m    "npm:font-awesome@4.7.0": {[m
[32m+[m[32m      "css": "github:systemjs/plugin-css@0.1.22"[m
[32m+[m[32m    },[m
     "npm:inherits@2.0.1": {[m
       "util": "github:jspm/nodelibs-util@0.1.0"[m
     },[m
[36m@@ -88,6 +96,11 @@[m [mSystem.config({[m
       "custom-event-polyfill": "npm:custom-event-polyfill@0.2.2",[m
       "decamelize": "npm:decamelize@1.2.0",[m
       "focusin": "npm:focusin@2.0.0"[m
[32m+[m[32m    },[m
[32m+[m[32m    "voya-github:Voya/deep-ui-voya-tooltip@2.8.3": {[m
[32m+[m[32m      "debounce": "npm:debounce@1.0.0",[m
[32m+[m[32m      "voya-base-styles": "voya-github:Voya/deep-ui-voya-base-styles@2.4.1",[m
[32m+[m[32m      "voya-component-utils": "voya-github:Voya/deep-ui-voya-component-utils@3.4.1"[m
     }[m
   }[m
 });[m
[1mdiff --git a/demo/demo.css b/demo/demo.css[m
[1mindex 73ee13c..7e9ceb7 100644[m
[1m--- a/demo/demo.css[m
[1m+++ b/demo/demo.css[m
[36m@@ -1,154 +1,5050 @@[m
[31m-/*base style sheet for component skinning*/[m
[31m-voya-table {[m
[31m-  font-family: Arial;[m
[31m-  font-size: 12px;[m
[31m-  display: block;[m
[31m-  border-bottom: 1px solid #aaa; }[m
[31m-  voya-table .deep-ui-voya-table {[m
[31m-    background: #fff;[m
[31m-    color: #666; }[m
[31m-  voya-table .voya-table-column-wrapper {[m
[31m-    width: 100%;[m
[32m+[m[32m@charset "UTF-8";[m
[32m+[m[32m/*![m
[32m+[m[32m *  Font Awesome 4.7.0 by @davegandy - http://fontawesome.io - @fontawesome[m
[32m+[m[32m *  License - http://fontawesome.io/license (Font: SIL OFL 1.1, CSS: MIT License)[m
[32m+[m[32m */[m
[32m+[m[32m/* FONT PATH[m
[32m+[m[32m * -------------------------- */[m
[32m+[m[32m@font-face {[m
[32m+[m[32m  font-family: 'FontAwesome';[m
[32m+[m[32m  src: url("../fonts/fontawesome-webfont.eot?v=4.7.0");[m
[32m+[m[32m  src: url("../fonts/fontawesome-webfont.eot?#iefix&v=4.7.0") format("embedded-opentype"), url("../fonts/fontawesome-webfont.woff2?v=4.7.0") format("woff2"), url("../fonts/fontawesome-webfont.woff?v=4.7.0") format("woff"), url("../fonts/fontawesome-webfont.ttf?v=4.7.0") format("truetype"), url("../fonts/fontawesome-webfont.svg?v=4.7.0#fontawesomeregular") format("svg");[m
[32m+[m[32m  font-weight: normal;[m
[32m+[m[32m  font-style: normal; }[m
[32m+[m
[32m+[m[32m.fa {[m
[32m+[m[32m  display: inline-block;[m
[32m+[m[32m  font: normal normal normal 14px/1 FontAwesome;[m
[32m+[m[32m  font-size: inherit;[m
[32m+[m[32m  text-rendering: auto;[m
[32m+[m[32m  -webkit-font-smoothing: antialiased;[m
[32m+[m[32m  -moz-osx-font-smoothing: grayscale; }[m
[32m+[m
[32m+[m[32m/* makes the font 33% larger relative to the icon container */[m
[32m+[m[32m.fa-lg {[m
[32m+[m[32m  font-size: 1.33333em;[m
[32m+[m[32m  line-height: 0.75em;[m
[32m+[m[32m  vertical-align: -15%; }[m
[32m+[m
[32m+[m[32m.fa-2x {[m
[32m+[m[32m  font-size: 2em; }[m
[32m+[m
[32m+[m[32m.fa-3x {[m
[32m+[m[32m  font-size: 3em; }[m
[32m+[m
[32m+[m[32m.fa-4x {[m
[32m+[m[32m  font-size: 4em; }[m
[32m+[m
[32m+[m[32m.fa-5x {[m
[32m+[m[32m  font-size: 5em; }[m
[32m+[m
[32m+[m[32m.fa-fw {[m
[32m+[m[32m  width: 1.28571em;[m
[32m+[m[32m  text-align: center; }[m
[32m+[m
[32m+[m[32m.fa-ul {[m
[32m+[m[32m  padding-left: 0;[m
[32m+[m[32m  margin-left: 2.14286em;[m
[32m+[m[32m  list-style-type: none; }[m
[32m+[m[32m  .fa-ul > li {[m
     position: relative; }[m
[31m-  voya-table .voya-table-column-wrapper:after {[m
[31m-    display: table;[m
[31m-    content: "";[m
[31m-    clear: both; }[m
[31m-  voya-table .voya-table-rows-wrapper {[m
[31m-    position: relative;[m
[31m-    overflow-y: auto; }[m
[31m-  voya-table.mobile .deep-ui-voya-table {[m
[31m-    background: transparent; }[m
 [m
[31m-/*base style sheet for component skinning*/[m
[31m-voya-column {[m
[31m-  position: relative;[m
[31m-  float: left;[m
[31m-  display: block;[m
[31m-  padding: 0px 2%;[m
[31m-  background: linear-gradient(to bottom, #e2e2e2 0%, #dbdbdb 50%, #d1d1d1 51%, #fefefe 100%);[m
[31m-  border: 1px solid #aaa;[m
[31m-  border-right: 0px;[m
[31m-  min-height: 30px;[m
[31m-  box-sizing: border-box;[m
[31m-  font-weight: bold;[m
[31m-  font-size: 14px;[m
[31m-  color: #666; }[m
[31m-  voya-column.cursor {[m
[31m-    cursor: pointer; }[m
[31m-  voya-column.orange {[m
[31m-    background: linear-gradient(to bottom, #feccb1 0%, #f17432 50%, #ea5507 51%, #fb955e 100%);[m
[31m-    color: #fff;[m
[31m-    text-shadow: -1px -1px 1px #F2AD89, 1px 1px 1px #732903;[m
[31m-    border: 1px solid #B04F07;[m
[31m-    border-right: 0px; }[m
[31m-  voya-column.white {[m
[31m-    background: #fff;[m
[31m-    color: #000;[m
[31m-    font-size: 14px;[m
[31m-    font-weight: bold;[m
[31m-    font-family: 'Proxima Nova Bold', 'Proxima Nova'; }[m
[31m-  voya-column.none {[m
[31m-    border: 0px !important; }[m
[31m-  voya-column div.label {[m
[31m-    position: absolute;[m
[31m-    display: block;[m
[31m-    padding: 0px 0px;[m
[31m-    top: 50%;[m
[31m-    transform: translateY(-50%); }[m
[31m-  voya-column div:after {[m
[31m-    display: table;[m
[31m-    content: "";[m
[31m-    clear: both; }[m
[31m-  voya-column div.voya-col-actions {[m
[31m-    position: absolute;[m
[31m-    right: 0px;[m
[31m-    top: 50%;[m
[31m-    transform: translateY(-50%);[m
[31m-    padding: 0px 5px; }[m
[31m-  voya-column div.voya-col-actions > div {[m
[31m-    padding: 0px 2px;[m
[31m-    float: left; }[m
[31m-  .mobile voya-column {[m
[31m-    display: none; }[m
[32m+[m[32m.fa-li {[m
[32m+[m[32m  position: absolute;[m
[32m+[m[32m  left: -2.14286em;[m
[32m+[m[32m  width: 2.14286em;[m
[32m+[m[32m  top: 0.14286em;[m
[32m+[m[32m  text-align: center; }[m
[32m+[m[32m  .fa-li.fa-lg {[m
[32m+[m[32m    left: -1.85714em; }[m
[32m+[m
[32m+[m[32m.fa-border {[m
[32m+[m[32m  padding: .2em .25em .15em;[m
[32m+[m[32m  border: solid 0.08em #eee;[m
[32m+[m[32m  border-radius: .1em; }[m
[32m+[m
[32m+[m[32m.fa-pull-left {[m
[32m+[m[32m  float: left; }[m
[32m+[m
[32m+[m[32m.fa-pull-right {[m
[32m+[m[32m  float: right; }[m
[32m+[m
[32m+[m[32m.fa.fa-pull-left {[m
[32m+[m[32m  margin-right: .3em; }[m
[32m+[m
[32m+[m[32m.fa.fa-pull-right {[m
[32m+[m[32m  margin-left: .3em; }[m
[32m+[m
[32m+[m[32m/* Deprecated as of 4.4.0 */[m
[32m+[m[32m.pull-right {[m
[32m+[m[32m  float: right; }[m
[32m+[m
[32m+[m[32m.pull-left {[m
[32m+[m[32m  float: left; }[m
[32m+[m
[32m+[m[32m.fa.pull-left