---
category: calling
title: 'Voice & Video Calls'
layout: nil
---

### Call Controller - Dialog

When you start or receive a call, Bit6 provides you a controller object, `bit6.Dialog`, to controll the call.

### Start an Outgoing Call

```js
// Specify if this is a voice or video call
var opts = {
  audio: true,
  video: true
};

// Start the call and get a call controller (Dialog)
var d = b6.startCall('usr:john', opts);
if (d) {
  //  ... Setup the UI elements ...
  // When starting a media connection, we need
  // to provide media elements - <audio> or <video>
  // For audio-only calls <video> also seem to work
  var opts = {
    localMediaEl: $('#localVideo')[0],
    remoteMediaEl: $('#remoteVideo')[0]
  };
  // Start the call connection
  d.connect(opts);
}
```

### Handle an Incoming Call
```js
b6.on('incomingCall', function(d) {
  console.log('Incoming call', d);
  // Decide if you want to accept or reject the call
  var acceptThisCall = true;
  // Accept this call and connect media
  if (acceptThisCall) {
    var opts = {
      localMediaEl: $('#localVideo')[0],
      remoteMediaEl: $('#remoteVideo')[0]
    };
    // Start the call connection
    d.connect(opts);
  }
  // Reject this call
  else {
    d.hangup();
  }
});

```

### End a call
```js
// Hangup or reject a call
d.hangup()
```

### Events
You can notifications about the call progress by adding event handler to the instance of `bit6.Dialog`.

```js
// Call progress
d.on('progress', function() {
  console.log('Call progress', d);
});
// Call answered
d.on('answer', function() {
  console.log('Call answered', d);
});
// Error during the call
d.on('error', function() {
  console.log('Call error', d);
});
// Call ended
d.on('end', function() {
  console.log('Call ended', d);
});
```




