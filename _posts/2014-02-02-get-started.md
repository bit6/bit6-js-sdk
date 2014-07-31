---
title: 'Getting Started'

layout: nil
---

### Get Bit6 API Key
You will need an API key in order to initialize and use Bit6 SDK. Get it [here](http://bit6.com/contact/).

### Manual Installation

[Download](https://github.com/bit6/bit6-js-sdk/) the SDK. At a very minimum you will need just `bit6.min.js` file.

### Install Using 'bower'

```
bower install bit6
```

### Initialize the SDK

```html
<script src="bit6.min.js"></script>
<script>
  var opts = {
    apikey: 'MyApiKey',
  }
  var b6 = new Bit6(opts);
</script>
```

### Event Handlers

During the initialization you can also provide event handler functions. They will be notified when a new call is received, messages updated etc.

```html
<script>
  var opts = {
    apikey: 'MyApiKey',
    onMessagesUpdated: function() {
      console.log('Messages updated');
    },
    onIncomingCall: function(from, hasVideo) {
      console.log('Incoming call from=', from, ' hasVideo=', hasVideo);
    },
    onCallEnded: function(from) {
      console.log('Call ended from=', from);
    }
  }
  var b6 = new Bit6(opts);
</script>

```
