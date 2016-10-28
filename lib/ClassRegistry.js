/**
 * Created by Ralph Varjabedian.
 * nodetastic is licensed under the [BSD-3 License] https://raw.githubusercontent.com/ralphv/nodetastic/master/LICENSE.
 * do not remove this notice.
 */

"use strict";

function ClassRegistryDataStructure() {
  // for the class registry, I am using a special Tree structure called Trie, this will ensure very fast lookup for classes from urls (even composite urls) complexity=O(url parts)
  this.tree = {value: null, hash: {}};
}

ClassRegistryDataStructure.prototype = {
  processUrl: function(url) {
    if(url.indexOf("/") == 0) {
      url = url.substring(1);
    }
    if(url.length > 1 && url[url.length - 1] === '/') {
      url = url.substring(0, url.length - 1);
    }
    return url;
  },
  add: function(url, value) {
    if(this.prefix) {
      url = this.prefix + "/" + url;
    }
    url = this.processUrl(url);
    var urlParts = url.split(this.urlPartRegex);
    var ptr = this.tree;
    for(var i = 0; i < urlParts.length; i++) {
      if(!ptr.hash[urlParts[i]]) {
        ptr.hash[urlParts[i]] = {value: null, hash: {}};
      }
      ptr = ptr.hash[urlParts[i]];
    }
    if(ptr.value) {
      throw new Error("duplicate url for class registry for url:" + url);
    }
    ptr.value = value;
  },
  generateUrls: function() {
    let urlArray = [];
    this._traverseTree("", this.tree, urlArray);
    return urlArray;
  },
  get: function(url) {
    url = this.processUrl(url);
    var urlParts = url.split(this.urlPartRegex);
    var ptr = this.tree;
    var i;
    for(i = 0; i < urlParts.length; i++) {
      if(!ptr.hash[urlParts[i]]) {
        break;
      }
      ptr = ptr.hash[urlParts[i]];
    }
    var urlPartsConsumed = urlParts.slice(0, i);
    if(urlPartsConsumed.length > 0 && urlPartsConsumed[0] === this.prefix) {
      urlPartsConsumed.splice(0, 1);
    }
    urlParts = urlParts.slice(i);
    return {value: ptr.value, pathConsumed: "/" + urlPartsConsumed.join("/"), pathLeft: "/" + urlParts.join('/')};
  },
  getEmptyPath: function(url) {
    // special case, the url is not empty, but we need to lookup the empty class, the pathLeft should remain the full url
    return {value: (this.tree.hash[this.processUrl("")] && this.tree.hash[this.processUrl("")].value), pathConsumed: "/", pathLeft: url};
  },
  urlPartRegex: /\//,
  _traverseTree: function(prefix, tree, urlArray) {
    var keys = Object.keys(tree.hash);
    for(var i = 0; i < keys.length; i++) {
      this._traverseTree(prefix + "/" + keys[i], tree.hash[keys[i]], urlArray);
    }
    if(tree.value) { // handler
      this._traverseHandler(prefix, tree.value, urlArray);
    }
  },
  _traverseHandler: function(prefix, handler, urlArray) {
    var keys = Object.keys(handler);
    for(var i = 0; i < keys.length; i++) {
      if(typeof(handler[keys[i]]) == "function") {
        var url = {};
        var result = this._getFunctionNameAndMethod(keys[i]);
        url.path = prefix + "/" + result.name;
        url.method = result.method;
        url.fn = handler[keys[i]];
        urlArray.push(url);
      } else {
        this._traverseHandler(prefix + "/" + keys[i], handler[keys[i]], urlArray);
      }
    }
  },
  _getFunctionNameAndMethod: function(name) {
    var methods = ["post", "get", "delete", "put"];
    for(var i = 0; i < methods.length; i++) {
      if(name.endsWith("_" + methods[i])) {
        return {name: name.substring(0, name.length - methods[i].length - 1), method: methods[i]};
      }
    }
    return {name};
  },
  __end: 0
};

module.exports = ClassRegistryDataStructure;