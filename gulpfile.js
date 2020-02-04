const { src, dest, task, series, parallel, watch } = require('gulp')
const browserSync = require('browser-sync').create()
const compiler = require('webpack')
const del = require('del')
const fs = require('fs')
const named = require('gulp-named')
const nunjucks = require('nunjucks')
const plugins = require('gulp-load-plugins')()
const through = require('through2')
const Vinyl = require('vinyl')
const webpack = require('webpack-stream')

const paths = {
    posts: [
        './src/**/*.md',
    ],
    scripts: './src/scripts/main.js',
    styles: [
        './src/styles/*.scss',
    ],
}

const nunjucksEnv = nunjucks.configure('./views')
nunjucksEnv.addFilter('date', require('nunjucks-date'))

let tags = {}

function aggregateData() {
    return through.obj(
        (file, encoding, cb) => {
            let fileTags = file.data.tags || []

            if(file.data.tag) {
                fileTags.push(tag)
            }

            fileTags.forEach(tag => {
                if (typeof tags[tag] === 'undefined') {
                    tags[tag] = []
                }

                tags[tag].push(file)
            })

            cb(null, file)
        },
        function (cb) {
            Object.keys(tags).forEach(tag => {
                tags[tag].sort((a, b) => a.data.date - b.data.date)

                contents = ''

                this.push(new Vinyl({
                    data: {
                        posts: tags[tag],
                        tag,
                        title: tag,
                        view: 'tag.njk',
                    },
                    path: 'tags/' + tag + '/index.md',
                    contents: Buffer.from(contents)
                }))
            })

            cb()
        }
    )
}

function posts() {
    return src(paths.posts)
        .pipe(plugins.frontMatter({
            property: 'data',
            remove: true,
        }))
        .pipe(aggregateData())
        .pipe(plugins.rename(path => {
            const result = path.basename.match(/^(?<year>[0-9]{4})-(?<month>[0-9]{2})-(?<day>[0-9]{2})-(?<slug>.*)$/)

            if (result) {
                const { groups: { year, month, day, slug }} = result

                path.dirname = `${path.dirname}/${year}/${month}/${day}/${slug}`
                path.basename = 'index'
                path.extname = '.md'
            }
        }))
        .pipe(plugins.tap((file, t) => {
            plugins.util.log(file.path)
            plugins.util.log(tags)
        }))
        .pipe(plugins.markdown())
        .pipe(plugins.ssg())
        .pipe(plugins.wrap(
            (data) => fs.readFileSync('./views/' + data.view).toString(),
            { site: { link: 'https://datashaman.com', title: 'datashaman' }, nunjucksEnv },
            { engine: 'nunjucks' }
        ))
        .pipe(dest('./build'))
}

function scripts() {
    return src(paths.scripts)
        .pipe(webpack({
            mode: process.env.NODE_ENV || 'development',
            output: {
                filename: 'main.js',
            },
        }))
        .pipe(dest('./build/scripts'))
}

function styles() {
    return src(paths.styles)
        .pipe(plugins.sourcemaps.init())
        .pipe(plugins.sass())
        .pipe(plugins.sourcemaps.write())
        .pipe(dest('./build/styles'))
        .pipe(browserSync.reload({
            stream: true,
        }))
}

function clean() {
    return del('./build')
}

task('watch', () => {
    watch(paths.scripts, scripts)
    watch(paths.posts, posts)
    watch(paths.styles, styles)
})

task('browserSync', () => {
    browserSync.init({
        server: {
            baseDir: 'build',
        },
    })
})

const build = series(clean, parallel(series(scripts, posts), styles))

exports.clean = clean
exports.posts = posts
exports.scripts = scripts
exports.styles = styles
exports.watch = series('browserSync', build, 'watch')
exports.build = build
exports.default  = build
