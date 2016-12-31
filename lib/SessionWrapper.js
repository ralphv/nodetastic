/**
 * Created by Ralph Varjabedian.
 * nodetastic is licensed under the [BSD-3 License] https://raw.githubusercontent.com/ralphv/nodetastic/master/LICENSE.
 * do not remove this notice.
 */

// in order to provide abstraction for session access and to allow the flexibility of changing the session modification
// any code using this layer should work with the req.$session instead with the req.session object directly
// this will ensure proper abstraction.

//<editor-fold defaultstate="collapsed" desc="ExpressSessionHandler">
function ExpressSessionHandler(session) {
  this.session = session;
}
ExpressSessionHandler.prototype = {
  get: function(key) {
    return this.session[key];
  },
  has: function(key) {
    return this.session && this.session.hasOwnProperty(key);
  },
  del: function(key) {
    delete this.session[key];
  },
  set: function(key, value) {
    this.session[key] = value;
  },
  getId: function() {
    return (this.session && this.session.id) ? this.session.id : null;
  },
  destroy: function(cb) {
    this.session.destroy(cb);
    this.session = null;
  },
  isValid: function() {
    return !!this.session;
  },
  persistNow: function(cb) {
    if (this.session.save) {
      this.session.save();
    }
    if (cb) {
      cb();
    }
  },
  getCoreSession: function() {
    return this.session;
  }
};
//</editor-fold>

function SessionWrapper(req) {
  this.req = req;
  this.store = new ExpressSessionHandler(this.req.session);
}

SessionWrapper.prototype = {
  get: function(key) {
    return this.store.get(key);
  },
  has: function(key) {
    return this.store.has(key);
  },
  del: function(key) {
    return this.store.del(key);
  },
  set: function(key, value) {
    return this.store.set(key, value);
  },
  getId: function() {
    return this.store.getId();
  },
  destroy: function(cb) {
    return this.store.destroy(cb);
  },
  isValid: function() {
    return this.store.isValid();
  },
  persistNow: function(cb) {
    return this.store.persistNow(cb);
  },
  getCoreSession: function() {
    return this.store.getCoreSession();
  }
};

module.exports = SessionWrapper;