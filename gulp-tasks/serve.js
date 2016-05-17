var gulp = require('gulp');
var browserSync = require('browser-sync');
var portNumber = 9000;
// this task utilizes the browsersync plugin
function getPortNumber(){
	var port = process.argv.filter(function(item){return item.indexOf('port:')!=-1})[0]
	return (port)? port.substring(port.indexOf(':')+1) : defaultPort;
}
gulp.task('serve', ['build:demo', 'js:watch', 'sass:watch'], function(done) {
  portNumber = getPortNumber(); ;
  gulp.watch('demo/index.html').on('change', browserSync.reload);
  gulp.watch('demo/demo-built.js').on('change', browserSync.reload);
  gulp.watch('demo/demo.css').on('change', browserSync.reload);

  browserSync({
    open: 'local',
    startPath: "/demo/index.html",
    port: portNumber,
    server: {
      baseDir: ['.'],
      middleware: function (req, res, next) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        next();
      }
    }
  }, done);
});
