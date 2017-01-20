var os = require('os');
var Path = require('path');

var gulp = require("gulp"),
    ts = require("gulp-typescript"),
    merge = require('merge2'),
    fse = require('fs-extra'),
    sourcemaps = require('gulp-sourcemaps');

gulp.task('default', [ 'clean', 'compile-ts' ]);

// https://www.npmjs.com/package/gulp-typescript
gulp.task("compile-ts", function ()
{
    var tsProject = ts.createProject(
        './src/tsconfig.json',
        {
            typescript: require('typescript')    // must a project package dependency
        });

    var tsResult =
        gulp.src(['./src/**/*.ts'])
            .pipe(sourcemaps.init())
            .pipe(tsProject());

    return merge([
            tsResult.dts
                .pipe(gulp.dest('dist')),
            tsResult.js
                .pipe(sourcemaps.write('.', {
                    includeContent: false,
                    sourceRoot: "../src"
                }))
                .pipe(gulp.dest('dist'))
        ]
    );
});

gulp.task('clean', function(done) { fse.remove('dist', done);});
