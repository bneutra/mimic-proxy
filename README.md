# mimic-proxy

This is WIP. HTTP is a rich protocol and I've only tested this with pretty simple traffic. There are a number of record/play applications out there. A lot of them require quite a bit of user interaction, so I created this to prototype what I thought would be a good workflow for mocking out dependencies in an e2e test with minimum effort.

This repo has two scripts:

recorder.js: that can be configured as a proxy to record responses from a RESTful https dependency.

player.js: that can "replay" the responses that were recorded.

It can be used in the context of an e2e test. For example, where you want to exercise a particular sequence of actions on your application but don't want your https dependency (e.g. an external api) to make test flakey; i.e. it makes the test "self-contained" and therefore more reliable.

Unlike typical mocking techniques you don't have to hand-craft (copy-paste) stub responses and you don't have to modify the application under test in any way. Just point your application at the proxy, run the test in "live" mode with the recorder and, subsequently, run the test in "replay" mode using the player.

Saved responses (the headers and data) are "keyed" on the request method, the url requested and an optional counter, if more than one of that request was made (if that's the case, the order of requests must be predictable).

Try it. Create a config.js file:

```
module.exports = {
  dataPath: 'proxydata',
  targetHost: 'api.github.com',
  port: 8092,
  delayMs: 1
}
```

Start the recorder:
```
$ node recorder.js
```

Make a request:
```
$ curl localhost:8092/foo
```

And see what it did.
```
$ ls proxydata/api.github.com/
GET_foo.1    MANIFEST.txt

$ cat proxydata/api.github.com/MANIFEST.txt 
GET_foo.1

 cat proxydata/api.github.com/GET_foo.1 
{
    "requestUrl": "/foo",
    "headers": {
        "date": "Wed, 28 Mar 2018 21:11:56 GMT",
        "content-type": "application/json; charset=utf-8",
        "content-length": "87",
        "server": "GitHub.com",
        "status": "404 Not Found",
...

```

Then run the player:
```
$ node player.js
$ curl localhost:8092/foo
{"message":"Not Found","documentation_url":"https://developer.github.com/v3"}
```
