/**
 * Created by Ralph Varjabedian on 8/13/14.
 */

// in order to provide abstraction for session access and to allow the flexibility of changing the session modification
// any code using this layer should work with the req.$session instead with the req.session object directly
// this will ensure proper abstraction.

var useRestService = require("../config.js").useRestService;

//<editor-fold defaultstate="collapsed" desc="MongoStoreSessionHandler">
function MongoStoreSessionHandler(session) {
  this.session = session;
  this._session = this.session.serviceGet();
  if(!this._session) {
    this._session = {};
  }
}
MongoStoreSessionHandler.prototype = {
  get: function(key) {
    return this._session[key];
  },
  has: function(key) {
    return this._session && this._session.hasOwnProperty(key);
  },
  del: function(key) {
    delete this._session[key];
    this.session.serviceSet(this._session);
    //this._session = this.session.serviceGet();
  },
  set: function(key, value) {
    this._session[key] = value;
    this.session.serviceSet(this._session);
    //this._session = this.session.serviceGet();
  },
  getId: function() {
    return (this.session && this.session.id) ? this.session.id : null;
  },
  destroy: function(cb) {
    this.session.destroy(cb);
    this.session = null;
    this._session = null;
    // a temp fix until destroy is corrected in new session manager
    //var self = this;
    //this._session = {};
    //this.session.serviceSet({}, function() {
    //self.session.destroy(cb);
    //cb();
    //});
  },
  isValid: function() {
    return !!this._session;
  },
  persistNow: function(cb) {
    this.session.serviceSet(this._session, cb);
  },
  getCoreSession: function() {
    return this.session;
  }
};
//</editor-fold>

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
    cb();
  },
  getCoreSession: function() {
    return this.session;
  }
};
//</editor-fold>

function SessionWrapper(req) {
  this.req = req;
  if(useRestService && typeof(this.req.session.serviceSet) === "function" && typeof(this.req.session.serviceGet) === "function") { // this is coming from new rlo.lib.connect-mongostore
    //console.log("using new rlo.lib.connect-mongostore");
    this.store = new MongoStoreSessionHandler(this.req.session);
  } else {
    this.store = new ExpressSessionHandler(this.req.session);
  }
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