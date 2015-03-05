/**
 * Created by Ralph Varjabedian.
 * nodetastic is licensed under the [BSD-3 License] http://bitbucket.com/ralphv/nodetastic/raw/master/LICENSE.
 * do not remove this notice.
 */

"use strict";

function ClassRegistryDataStructure() {
  // for the class registry, I am using a special Tree structure called Trie, this will ensure very fast lookup for classes from urls (even composite urls) complexity=O(url parts)
  this.tree = { value: null, hash: {} };
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
    return { value: ptr.value, pathConsumed: "/" + urlPartsConsumed.join("/"), pathLeft: "/" + urlParts.join('/') };
  },
  getEmptyPath: function(url) {
    // special case, the url is not empty, but we need to lookup the empty class, the pathLeft should remain the full url
    return { value: (this.tree.hash[this.processUrl("")] && this.tree.hash[this.processUrl("")].value), pathConsumed: "/", pathLeft: url };
  },
  urlPartRegex: /\//,
  __end: 0
};

module.exports = ClassRegistryDataStructure;