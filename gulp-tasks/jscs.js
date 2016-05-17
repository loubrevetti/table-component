var gulp = require('gulp');
var jscs = require('gulp-jscs');
var stylish = require('gulp-jscs-stylish');

gulp.task('jscs', function() {
    return gulp.src('./src/**/*.js')
        .pipe(jscs())
        .on('error', function() {})
        .pipe(stylish());
});

// running this task will reformat all code in the src directory
gulp.task('jscs:fix', function() {
    return gulp.src('./src/**/*.js')
        .pipe(jscs({fix: true}))
        .on('error', function() {})
        .pipe(stylish())
        .pipe(gulp.dest('src'));
});
