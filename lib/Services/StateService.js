/**
 * Created by Ralph Varjabedian on 2/27/14.
 */

var result = require('cb-result');

// simple class to handle states, a minimilistic state machine, used for login/logout state
function StateObject(dynamicHttpMapper, opts) {
  this.IsService = true;
  this.constructor = StateObject;

  var self = this;
  dynamicHttpMapper.injectReservedValue("$state", function(obj, param, $session) {
    return new StateObjectInject(self, $session);
  });

  this.states = opts.states;
  this.valid = opts.valid;
  this.start = opts.start;
  this.defaultMeta = opts.defaultMeta;
}

StateObject.AttachedPropertyName = "__stateObjectAz340";
StateObject.prototype = {
  processRequest: function($session, request) {
    var currentState = this.get($session);
    var functionAllowedState = this.defaultMeta;
    if(request.map.meta && request.map.meta.StateService) {
      functionAllowedState = request.map.meta.StateService;
    }
    if(functionAllowedState !== "any" && currentState !== functionAllowedState) {
      return result.errorCode(402, "invalid state, must be: " + functionAllowedState);
    }
  },
  processResult: function($session, httpRet) {
    // add the state to all returns
    if($session.isValid()) {
      httpRet.state = this.get($session);
    } else {
      httpRet.state = this.start;
    }
  },
  get: function($session) {
    var currentState = $session.get(StateObject.AttachedPropertyName);
    if(!currentState) {
      $session.set(StateObject.AttachedPropertyName, this.start);
      currentState = $session.get(StateObject.AttachedPropertyName);
    }
    return currentState;
  },
  set: function($session, newState) {
    var currentState = this.get($session);
    if(newState == currentState) {
      return;
    }
    if(this.states.indexOf(newState) === -1) {
      throw new Error("invalid state given to $state:set");
    }
    if(this.valid[newState].indexOf(currentState) === -1) { // not valid move
      throw new Error("invalid jump state from " + currentState + " to " + newState);
    }
    $session.set(StateObject.AttachedPropertyName, newState);
  },
  __end: 0
}

function StateObjectInject(stateObject, $session) {
  this.$session = $session;
  this.stateObject = stateObject;
}

StateObjectInject.prototype = {
  get: function() {
    return this.stateObject.get(this.$session);
  },
  set: function(newState) {
    return this.stateObject.set(this.$session, newState);
  }
};

module.exports = StateObject;