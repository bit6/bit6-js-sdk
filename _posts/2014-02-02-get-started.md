---
title: 'Getting Started'
---

### Get Bit6 API Key
You will need an API key to use the SDK. Get it [here](http://bit6.com/contact/).

### Install manually

[Download](https://github.com/bit6/bit6-js-sdk/) the SDK. You just need `bit6.min.js` file.

### Install using 'bower'

```
bower install bit6
```

### Sample App

The [demo.bit6.com](http://demo.bit6.com) app sources are located in `samples/demo/` folder in the SDK repo.

The sample app is made as simple as possible to demonstrate the use of the Bit6 SDK. The UI is very basic and includes only the essential elements. Modify <b>`js/demo.js`</b> to include your API key.


### Initialize the SDK

```html
<script src="bit6.min.js"></script>
<script>
  var opts = {
    apikey: 'MyApiKey',
  };
  var b6 = new bit6.Client(opts);
</script>
```
