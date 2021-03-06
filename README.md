# Offtools
This library will help you to bring offline capabilities easily into an existing web app without any refactoring needed.
It gives you the possibility to configure individual fallback strategies for the case of lost connection - the offline case - to enhance the user experience by perpetuating the application flow.

- Decorates the native XHR for monitoring
- Individual request handlers to serve as a proxy in combination with decorated XHR
- Indication of offline case by faulty requests
- Individual fallback functions being called in offline case
- Caching of server response with refetching interval

In near Future:
- Check constantly if connection is restored
- Event subscriber system to listen on offline/online
- Automatic server synchronisation mechanism in case the user application data are further developed while connection is lost
- Refetching requests depending on others / request chain

**Attention:**
According to size and complexity of your application you should implement large-scale refactoring including server-side or do a reimplementation of your hole application in order to bring the fully offline experience to your users.
  Thereby, every online process, meaning every request to server should be challenged heavy. Ideally the server remains behind only as a persistence storage and to serve the static application resources when needed.

##Install
Just bring the library file in your application. Then the library is available in the global window object ```window.Offtools```. So just use ```Offtools```.

##Usage
To enhance the user experience of your application while being offline, just add individually configured handlers for the specific urls/routes of the server-side application used in AJAX requests.
Everything else is done automatically by the library.
```javascript
// Add specific response handlers;
Offtools.addResponseHandler(
    // url of an ajax request you want to make offline ready
    "/specific/route",
    // optional options
    {
        // Identification for the handler; used in future features
        alias: autogenerated,
        // Save server responses to cache
        cacheEnabled: true,
        // Interval in seconds for refetching an XHR
        refetchInterval: 0,
        // fallback function being called while offline
        fallback: function(handler, args){
            // example
            document.querySelector("#log").innerHTML = "Connection is lost, do alternative app flow here. Don't treat scenario as error!";
            return "RESPONSE SUCCESFULLY SETTED FROM FALLBACK CALLBACK";
        },
        // Set fallback result as response, only in offline case
        fallbackResultAsResponseEnabled: true,
        // Save fallback result to cache and use it as proxy response for upcoming requests
        fallbackResultToCacheEnabled: false

        // In near Future
        dataSyncEnabled: false,
        dataSyncUrl: undefined,
        parentRequestAlias: undefined,
        childRequestAlias: undefined
    }
);
```
##Changelog
Experimental