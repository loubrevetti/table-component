var jshint = require('gulp-jshint');
var gulp   = require('gulp');
 
gulp.task('jshint', function() {
  return gulp.src('./src/**/*.js')
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('jshint-stylish'));
});