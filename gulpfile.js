const { src, dest, task, series, parallel, watch } = require('gulp')
const browserSync = require('browser-sync').create()
const compiler = require('webpack')
const del = require('del')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const named = require('gulp-named')
const nunjucks = require('nunjucks')
const plugins = require('gulp-load-plugins')()
const webpack = require('webpack-stream')

const paths = {
    posts: [
        './src/posts/*.md',
    ],
    scripts: './src/scripts/main.js',
    styles: [
        './src/styles/*.scss',
    ],
}

const nunjucksEnv = nunjucks.configure('./views')
nunjucksEnv.addFilter('date', require('nunjucks-date'))

function posts() {
    return src(paths.posts)
        .pipe(plugins.rename(path => {
            const { groups: { year, month, day, slug }} =
                path.basename.match(/^(?<year>[0-9]{4})-(?<month>[0-9]{2})-(?<day>[0-9]{2})-(?<slug>.*)$/)

            return {
                dirname: `${path.dirname}/${year}/${month}/${day}/${slug}`,
                basename: 'index',
                extname: '.html',
            }
        }))
        .pipe(plugins.frontMatter({
            property: 'data',
            remove: true,
        }))
        .pipe(plugins.markdown())
        .pipe(plugins.ssg())
        .pipe(plugins.wrap(
            { src: './views/post.njk' },
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
        }, compiler))
        .pipe(dest('./build/scripts'))
}

function styles() {
    return src(paths.styles)
        .pipe(plugins.sass())
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
exports.watch = series('browserSync', scripts, posts, styles, 'watch')
exports.build = build
exports.default  = build
