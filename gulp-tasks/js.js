var gulp = require('gulp');
var shell = require('gulp-shell');

gulp.task('js:demo', shell.task([
  'jspm bundle-sfx demo/demo demo/demo-built.js'
]));

gulp.task('js:dist', shell.task([
  'jspm bundle-sfx voya-com-build-src/voya-guidance-wizard dist/voya-guidance-wizard.js --skip-source-maps'
]));

gulp.task('js:watch', function() {
    return gulp.watch(['./src/**/*.js', './demo/demo.js'], ['js:demo']);
});
