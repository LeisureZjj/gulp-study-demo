var gulp = require('gulp');
var gutil = require('gulp-util'); // 可用来打印日志，并着色。其他作用有待研究。
var colors = gutil.colors;
var gulpif = require('gulp-if'); // 添加条件判断。可配合 lasypipe 使用，lasypipe 可创建链式流，串行执行多个事件。
var watchPath = require('gulp-watch-path');
var combiner = require('stream-combiner2');
var browserSync = require('browser-sync').create(); // 自动加载变化的 JS、CSS，并能自动刷新页面。支持局域网内多个设备同时演示。
var runSequence = require('run-sequence'); // 串行、并行执行 task。等到 gulp 4.x 之后自带串行、并行执行 task 功能。
var uglify = require('gulp-uglify'); // 压缩 js 文件。
var rename = require('gulp-rename'); // 重名文件，有时需要把静态文件重命名为 .min.js/.min.css 格式。
var sourcemaps = require('gulp-sourcemaps'); // 生产环境的静态文件往往经过压缩，利用这个插件方便生产环境调试。
var cleanCSS = require('gulp-clean-css'); // 压缩 CSS。
var sass = require('gulp-sass');
var htmlmin = require('gulp-htmlmin'); // 可以压缩页面javascript、css，去除页面空格、注释，删除多余属性等操作。
var imagemin = require('gulp-imagemin'); // 压缩图片文件和 svg。
var revAppend = require('gulp-rev-append'); // 给 html 页面上的静态文件(js/css)添加 hash 后缀，避免浏览器缓存。
var del = require('del'); // 删除文件
var concat = require('gulp-concat'); // 合并文件，减少网络请求。
var autoprefixer = require('gulp-autoprefixer'); // 给不标准的 CSS 属性添加浏览器前缀。

var condition = true; // true: 生产环境，false: 开发环境。
var paths = {
  src: {
    html: 'src/html/',
    js: 'src/js/',
    css: 'src/css/',
    sass: 'src/sass/',
    img: 'src/img/'
  },
  dist: {
    html: 'dist/html/',
    js: 'dist/js/',
    css: 'dist/css/',
    img: 'dist/img/',
    jsmap: '../map/js/',
    cssmap: '../map/css/'
  }
};

// 用于输出 stream-combiner2 的 error 内容
/*var handleError = function (err) {
    console.log('\n');
    gutil.log(colors.red('Error!'));
    gutil.log('fileName: ' + colors.red(err.fileName));
    gutil.log('lineNumber: ' + colors.red(err.lineNumber));
    gutil.log('message: ' + colors.cyan(err.message));
    gutil.log('plugin: ' + colors.yellow(err.plugin));
};*/


gulp.task('default', ['dev']);


// 开发环境使用
gulp.task('dev', function (done) {
  condition = false;
  // 参数按先后顺序串行执行。
  // 同一个数组参数里，各任务并行执行。
  runSequence(
    ['uglify-js', 'minify-css', 'minify-image', 'minify-html'],
    ['watchFiles'],
    ['browser-sync'],
    done
  );
});


// 生产环境使用
gulp.task('build', function (done) {
  runSequence(
    ['clean-dist'],
    ['uglify-js', 'minify-css', 'minify-image', 'minify-html'],
    done
  );
});


gulp.task('browser-sync', function () {
  browserSync.init({
    server: {
      baseDir: './dist',
      index: 'index.html'
    },
    proxcy: 'gulpstudy.com'
  });
});


gulp.task('watchFiles', function () {
  // 此种方式监听文件时，一个文件变化，会编译所有同类文件。所以性能差。
  gulp.watch('src/**/*.html', ['minify-html']);
  gulp.watch(paths.src.js + '**/*.js', ['uglify-js']);
  gulp.watch(paths.src.css + '**/*.css', ['minify-css']);
  gulp.watch(paths.src.img + '**/*', ['minify-image']);

  // 有些 gulp 任务编译出错会终止 gulp.watch，
  // 使用 gulp-watch-path 配合 stream-combiner2 可避免这种情况。
  // 并且 gulp-watch-path 配合 event 使用时，只会对有变化的文件进行编译。（貌似没效果）
  // gulp.watch(paths.src.js + '**/*.js', function (event) {
  //   var path = watchPath(event, 'src/', 'dist');

  //   /*path 属性示例:
  //       {
  //         srcPath: 'src/js/a.js',
  //         srcDir: 'src/js/',
  //         distPath: 'dist/js/a.js',
  //         distDir: 'dist/js/',
  //         srcFilename: 'a.js',
  //         distFilename: 'a.js'
  //       }*/

  //   gutil.log(colors.cyan(event.type + ': ' + path.srcPath));
  //   gutil.log(colors.cyan('Output: ' + path.distPath));

  //   var combined = combiner.obj([
  //       gulp.src(paths.src.js + '**/*.js'),
  //       sourcemaps.init(),
  //       uglify(),
  //       sourcemaps.write(paths.dist.jsmap),
  //       gulp.dest(paths.dist.js)
  //     ]);
  //   combined.on('error', handleError);
  // });
});


gulp.task('minify-html', function () {
  var options = {
      removeComments: true, // 清除HTML注释
      collapseWhitespace: true, // 压缩HTML
      minifyJS: true, // 压缩页面JS
      minifyCSS: true, // 压缩页面CSS
      removeEmptyAttributes: true // 删除所有空格作属性值 <input id="" /> ==> <input />
  };
  gulp.src(paths.src.html + '**/*.html')
      .pipe(revAppend())
      .pipe(gulpif(condition, htmlmin(options)))
      .pipe(gulp.dest(paths.dist.html));
  gulp.src(['src/index.html'])
      .pipe(revAppend())
      .pipe(gulpif(condition, htmlmin(options)))
      .pipe(gulp.dest('dist'));
});


gulp.task('uglify-js', function () {
  gulp.src(paths.src.js + '**/*.js')
      .pipe(sourcemaps.init())
      .pipe(gulpif(condition, uglify()))
      .pipe(sourcemaps.write(paths.dist.jsmap))
      .pipe(gulp.dest(paths.dist.js));
});


gulp.task('minify-css', function () {
  gulp.src(paths.src.css + '**/*.css')
      .pipe(sourcemaps.init())
      .pipe(gulpif(condition, cleanCSS()))
      .pipe(sourcemaps.write(paths.dist.cssmap))
      .pipe(gulp.dest(paths.dist.css));
});


gulp.task('minify-image', function () {
  gulp.src(paths.src.img + '/**/*')
      .pipe(gulpif(condition, imagemin()))
      .pipe(gulp.dest(paths.dist.img));
});


gulp.task('clean-dist', function () {
  del('dist/**/*');
});