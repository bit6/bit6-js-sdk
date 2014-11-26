---
category: calling
title: 'Phone/PSTN Calls'
layout: nil
---

### Start a Phone Call

Bit6 interconnects with the phone networks (PSTN) and allows making outgoing phone calls.

Phone numbers must be in [E164](http://en.wikipedia.org/wiki/E.164) format, prefixed with `+`. So a US (country code `1`) number `(555) 123-1234` must be presented as `+15551231234`.

Note, that for the demo purposes you can only make 1 minute free phone calls to the US and Canada numbers.


```js
var phone = '+15551231234';
var d = b6.startCall('pstn:' + phone);
if (d) {
  var opts = {
    localMediaEl: $('#localVideo')[0],
    remoteMediaEl: $('#remoteVideo')[0]
  };
  // Start the call connection
  d.connect(opts);
}
```