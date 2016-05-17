var gulp = require('gulp');

gulp.task('build:demo', ['sass:demo','js:demo']);
gulp.task('build:dist', ['sass:dist','js:dist']);