---
title: 'Getting Started'
---

### Get Bit6 API Key
Go to [Dashboard](https://dashboard.bit6.com/) and get the API Key for your app.

### Install JS SDK

Either use 'bower'

```
bower install bit6
```

Or get the SDK from [GitHub Repo](https://github.com/bit6/bit6-js-sdk/). You just need `bit6.min.js` file.

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
