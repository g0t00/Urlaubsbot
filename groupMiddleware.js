const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

module.exports = function (opts) {
  opts = Object.assign({
    property: 'groupObj',
    getSessionKey: (ctx) => ctx.chat && `${ctx.chat.id}`,
    file: 'groups.asdl'
  }, opts)

  const adapter = new FileSync('db.blub')
  const db = low(adapter)

  db.defaults({  })
    .write();




  return (ctx, next) => {
    const key = opts.getSessionKey(ctx)
    if (!key) {
      return next(ctx)
    }
    let groupObj = db.get(key).value();
    Object.defineProperty(ctx, opts.property, {
      get: function () { return groupObj },
      set: function (newValue) { groupObj = Object.assign({}, groupObj) }
    })
    return next(ctx).then(() => store.set(key, groupObj));
  }
}
