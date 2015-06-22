/**
 * Created by Simon Neuberger on 02.01.15.
 * Offtools.js is a library to easily give offline capabilities subsequently to your web apps
 */
(function(){
    // todo: rethink private properties and methods
    // todo make private: responseHandlers, pickedRequests, responseHandlers, pickRequest, checkforrefetch, trigger
    var Offtools, extendObject;
    Offtools = {};
    Offtools.responseHandlers = [];
    Offtools.pickedRequests = [];
    Offtools.eventListeners = [];
    Offtools.options = {}; // todo: options e.g. automaticRetryWithoutHandler
    Offtools.connectionState = 'online';

    extendObject = function(target, source){
        if(source){
            for(var key in source){
                var val = source[key];
                if(typeof val !== "undefined"){
                    target[key] = val;
                }
            }
        }
        return target;
    };

    Offtools.pickRequest = function(xhr){
        Offtools.pickedRequests.push(xhr);
    };

    Offtools.saveToCache = function(url, data){
        localStorage[url] = JSON.stringify({
            data: data,
            lastFetchTimestamp: Date.now() / 1000 | 0
        });
    };

    Offtools.getFromCache = function(url){
        return localStorage[url] !== undefined ? JSON.parse(localStorage[url]) : undefined;
    };

    Offtools.getResponseHandlerByUrl = function(xhrUrl){
        var handlers = this.responseHandlers;
        for(var i = 0; i < handlers.length; i++){
            if(handlers[i].xhrUrl == xhrUrl){
                return handlers[i];
            }
        }
        return undefined;
    };

    Offtools.trigger = function(event){
        console.log(event);
        this.connectionState = event;
        // todo: dispatch all needed offline processes and rewinding online processes
        if(this.isConnectionState("ot_online")){
            var handlers = this.responseHandlers;

        }
    };

    Offtools.isConnectionState = function(state){
        return Offtools.connectionState == state;
    };

    Offtools.addResponseHandler = function(xhrUrl,options){
        var handler = new XhrHandler(xhrUrl);
        handler = extendObject(handler, options);
        this.responseHandlers.push(handler);
    };

    Offtools.checkForRefetch = function(lastFetchTime, interval){
        console.log((Date.now() / 1000 | 0) - lastFetchTime);
        console.log(((Date.now() / 1000 | 0) - lastFetchTime) > interval);
        return ((Date.now() / 1000 | 0) - lastFetchTime) > interval;
    };

    // XhrHandler class holding all information and directives for handling xhrs of an specific url
    function XhrHandler(xhrUrl){
        if(!(this instanceof XhrHandler)){
            return new XhrHandler(xhrUrl);
        }
        var self = this;
        this.xhrUrl = xhrUrl;
        this.fallback = undefined;
        this.lastFallbackResult = undefined;
        this.fallbackResultAsResponseEnabled = true;
        this.fallbackResultToCacheEnabled = false;
        this.xhrQueue = [];
        this.alias = "otHandler"+Math.floor((Math.random() * 100) + 1);
        this.cacheEnabled = true;
        this.dataSyncEnabled = false;
        this.dataSyncUrl = undefined;
        this.refetchInterval = 0; // Interval in seconds for refetching an XHR
        this.refetchTimeouts = [];
        this.parentRequestAlias = undefined;
        this.childRequestAlias = undefined;
    }

    XhrHandler.prototype.isCacheEnabled = function(){
        return (this.cacheEnabled == true
            && !!('localStorage' in window && window['localStorage'] !== null));
    };

    XhrHandler.prototype.getOfflineResponse = function(xhr){
        console.log("getFallbackResponse");
        var response = undefined;
        // todo: fallback function must be treated separately
        if(this.fallback !== undefined) this.lastFallbackResult = this.fallback.call(this, xhr);
        if(this.isCacheEnabled()){
            var cache = this.getFromCache();
            response = cache == undefined ? 0 : cache.data;

        }
        if(this.fallbackResultAsResponseEnabled) response = this.lastFallbackResult;
        if(this.fallbackResultToCacheEnabled) this.saveToCache(this.lastFallbackResult);
        return response;
    };

    XhrHandler.prototype.invokeFallbackFunction = function(xhr){
        if(this.fallback !== undefined) this.lastFallbackResult = this.fallback.call(this, xhr);
    };

    XhrHandler.prototype.getFromCache = function(){
        return Offtools.getFromCache(this.xhrUrl);
    };

    XhrHandler.prototype.saveToCache = function(data){
        return Offtools.saveToCache(this.xhrUrl, data);
    };

    XhrHandler.prototype.isRefetchIntervalExpired = function(lastFetchTime){
        if(this.refetchInterval == 0) return false;
        if(lastFetchTime == undefined){
            var cache = Offtools.getFromCache(this.xhrUrl);
            lastFetchTime = cache == undefined ? 0 : cache.lastFetchTimestamp;
        }
        console.log((Date.now() / 1000 | 0) - lastFetchTime);
        console.log(((Date.now() / 1000 | 0) - lastFetchTime) > this.refetchInterval);
        return ((Date.now() / 1000 | 0) - lastFetchTime) > this.refetchInterval;
    };

    XhrHandler.prototype.isFetchingNeeded = function(){
        return this.isCacheEnabled()
            && (localStorage[this.xhrUrl]===undefined || this.isRefetchIntervalExpired());
    };

    XhrHandler.prototype.refetchAllXhr = function(){
        console.log("refetchAllXhr");
        // todo: refetch all request
    };

    // create XMLHttpRequest proxy object
    var nativeXhr = XMLHttpRequest;
    var nativeXhrProto = XMLHttpRequest.prototype;

    // override/decorate the native xhr to allow to modify the respone
    XMLHttpRequest = function() {
        var nativeObj = new nativeXhr();
        var self = this;

        this._url = null;
        this._sendArguments = null;
        this._handler = undefined;
        // todo: get original xhr's sourounding context ?
//        this._context = context || undefined;

        // properties we don't proxy because we override their behavior
        this.onreadystatechange = null;
        this.responseText = null;
        this.status = 0;
        this.readyState = 0;
        // Inner help
        this._responseText = undefined;
        this._status = 0;
        this._readyState = 0;

        // Override the native onreadystatechange for ability to manipulate response before delegated to user application
        nativeObj.onreadystatechange = function() {
            // some internal handling
            if(self.status == null || self.status == 0) self.status = nativeObj.status;
            if(self.readyState != nativeObj.readyState) self.readyState = nativeObj.readyState;
            if(self._status == 200) self.status = self._status;
            if(self._readyState == 4) self.readyState = self._readyState;

            // status codes >12000 could derive from IE, no support at the moment
            if (self.readyState === 4 && (self.status === 0 || self.status >= 12000)) {
                // offline case
//                console.log(self.status);
                Offtools.trigger('ot_offline');
//                console.log(self.responseText);
                var handlerResponse = undefined;
                if(self._handler !== undefined && self.responseText == null){
                    self._handler.invokeFallbackFunction(self);
                    if(!self._handler.isFetchingNeeded() || self._handler.fallbackResultAsResponseEnabled){
                        console.log("setoffresponse");
                        handlerResponse = self._handler.getOfflineResponse(self);
                    }
                    if(handlerResponse !== undefined ){
                        self.responseText = handlerResponse
                    }else{
                        self.responseText = undefined;
                        self._handler.xhrQueue.push(self);
                        self._handler.refetchTimeouts = window.setTimeout(function(self){
                            console.log("refetchTimeout");
                            self.open.apply(self, self._openArgs);
                            self.send.apply(self, self._sendArguments);
                        }.bind(null,self), self._handler.refetchInterval * 1000);
                    }
                }else{
                    // todo: if no response handler just grab the ajax call for global Offtools retry
                    // todo: offtools option
                    // Offtools.pickRequest(self);
                }
//                nativeObj.responseText.set('{"msg": "Hello"}');
            }else if (self.readyState === 4 && !(self.status === 0 || self.status >= 12000)) {
                // online case
                if(self._readyState != 4 && Offtools.isConnectionState("ot_offline")){
                    // todo: self._handler.xhrQueue.push(self); slice
                    var index = self._handler.xhrQueue.indexOf(self);
                    if (index > -1) {
                        self._handler.xhrQueue.splice(index, 1);
                    }
                    Offtools.trigger('ot_online');
                }
                if(self._handler.isCacheEnabled() && self._readyState != 4) Offtools.saveToCache(self._url, nativeObj.responseText);
                self.responseText = nativeObj.responseText || self._responseText;
            }
            if (self.onreadystatechange && self.responseText !== undefined) {
                // call user/client/application onreadystatechange callback
                return typeof self.onreadystatechange === "function" ? self.onreadystatechange.apply(self, arguments) : void 0;
            }
        };

        // Proxy an decorate the native open
        nativeOpenProto = nativeXhrProto.open;
        nativeObj.open = function(method, url){
            self._url = url;
            self._openArgs = arguments;
            self._handler = Offtools.getResponseHandlerByUrl(url);

            nativeOpenProto.apply(this, arguments);
        };

        // todo: ask for return offline fallback
        nativeSendProto = nativeXhrProto.send;
        nativeObj.send = function(){
            self._sendArguments = arguments;
            if(self._handler !== undefined && !self._handler.isFetchingNeeded()){
                // read from cache and bypass default behaviour and invoke onreadystatechange
                console.log("norefetch needed");
                self._readyState = 4;
                self._status = 200;
                self._responseText = self._handler.getFromCache().data;
                nativeObj.onreadystatechange.call(this);
            }else{
                console.log("else");
                nativeXhrProto.send.apply(this, arguments);
            }
        };

        // Delegate all other native properties
        for (var prop in nativeObj) {
            if (!(prop in self)) {
                (function(prop) {
                    if (typeof nativeObj[prop] === "function") {
                        Object.defineProperty(self, prop, {
                            value: function() {return nativeObj[prop].apply(nativeObj, arguments);}
                        });
                    } else {
                        Object.defineProperty(self, prop, {
                            get: function() {return nativeObj[prop];},
                            set: function(val) {nativeObj[prop] = val;}
                        });
                    }
                })(prop);
            }
        }
    };

    window.Offtools = Offtools;

}).call(this);