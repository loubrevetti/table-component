var gulp = require('gulp');
var ghPages = require('gulp-gh-pages');

gulp.task('gh-pages',['build:demo'], function() {
    return gulp.src('./demo/**/*')
        .pipe(ghPages({origin:"my-origin"}));
});
