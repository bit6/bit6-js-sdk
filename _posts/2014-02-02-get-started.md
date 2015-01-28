---
title: 'Getting Started'
---

### Get Bit6 API Key
Get API key [here](http://bit6.com/contact/).

### Install manually

Get the SDK from [GitHub Repo](https://github.com/bit6/bit6-js-sdk/) the SDK. You just need `bit6.min.js` file.

### Install using 'bower'

```
bower install bit6
```

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
