
/**
 * A clone of koa-mount module rewritten in es7 style
 */

const debug = require('debug')('mount');
const convert = require('koa-convert');
const assert = require('assert');

/**
 * Expose `mount()`.
 */

module.exports = mount;

/**
 * Mount `app` with `prefix`, `app`
 * may be a Koa application or
 * middleware function.
 *
 * @param {String|Application|Function} prefix, app, or function
 * @param {Application|Function} [app or function]
 * @return {Function}
 * @api public
 */

function mount(prefix, app) {
    if ('string' != typeof prefix) {
        app = prefix;
        prefix = '/';
    }

    assert('/' == prefix[0], 'mount path must begin with "/"');

    // compose
    var downstream = app.middleware
        ? convert.compose(app.middleware)
        : app;

    // don't need to do mounting here
    if ('/' == prefix) return downstream;

    var trailingSlash = '/' == prefix.slice(-1);

    var name = app.name || 'unnamed';
    debug('mount %s %s', prefix, name);

    return async (ctx, upstream) => {
        const prev = ctx.path;
        const newPath = match(prev);
        debug('mount %s %s -> %s', prefix, name, newPath);
        if (!newPath) return upstream();

        ctx.mountPath = prefix;
        ctx.path = newPath;
        debug('enter %s -> %s', prev, ctx.path);

        await downstream(ctx, async () => {
            ctx.path = prev;
            debug('leave %s -> %s', prev, ctx.path);
            return upstream();
        });
    }

    /**
     * Check if `prefix` satisfies a `path`.
     * Returns the new path.
     *
     * match('/images/', '/lkajsldkjf') => false
     * match('/images', '/images') => /
     * match('/images/', '/images') => false
     * match('/images/', '/images/asdf') => /asdf
     *
     * @param {String} prefix
     * @param {String} path
     * @return {String|Boolean}
     * @api private
     */

    function match(path) {
        // does not match prefix at all
        if (0 != path.indexOf(prefix)) return false;

        var newPath = path.replace(prefix, '') || '/';
        if (trailingSlash) return newPath;

        // `/mount` does not match `/mountlkjalskjdf`
        if ('/' != newPath[0]) return false;
        return newPath;
    }
}

