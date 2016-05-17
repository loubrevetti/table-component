var gulp = require('gulp');
var sass = require('gulp-sass');

gulp.task('sass:demo', function() {
    return gulp.src(['./demo/demo.scss'])
        .pipe(sass({importer: importer, includePaths: ['./demo/','./src/']}).on('error', sass.logError))
        .pipe(gulp.dest('./demo/'));
});

gulp.task('sass:dist', function() {
    return gulp.src(['./voya-com-build-src/deep-ui-voya-modal.scss'])
        .pipe(sass({importer: importer, includePaths: ['./jspm_packages/','./src/']}).on('error', sass.logError))
        .pipe(gulp.dest('./dist/'));
});

gulp.task('sass:watch', function() {
    return gulp.watch(['./src/**/*.scss', './demo/**/*.scss'], ['sass:demo']);
});

var System = require('systemjs');
var config = require('../config.js');
var path = require('path');
var appRoot = require('app-root-path');
/**
 * Transforms jspm paths
 *
 * jspm paths must be prefixed by 'jspm:'
 *
 * @param {String} url
 * @param {String} prev
 * @param {Function} done
 */
function importer(url, prev, done) {
    if (url.slice(0,5) === 'jspm:') {
        // Only transform strings prefixed with '~'
        System.normalize(url.slice(5)).then(function(normalized) {
            var filePath = normalized.replace(':', '/').replace('.js', '.scss').split('jspm_packages')[1];
            done({file: path.join(appRoot.path, 'jspm_packages', filePath)});
        });
    } else {
        done({file: url});
    }
}
