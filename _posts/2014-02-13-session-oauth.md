---
category: session
title: 'OAuth'
---

Bit6 integrates with various OAuth1 and OAuth2 providers for simplified user authentication.

### Get configured OAuth providers

```js
b6.getAuthInfo(function(err, infos) {
  if (err) {
    console.log('error', err);
  }
  else {
    console.log('configured auth providers:', infos);
  }
});
```

Sample response with OAuth2 configuration for Facebook and Google Account apps.

```js
{
  'facebook': {
    'client_id': '1234567890'
  },
  'google': {
    'client_id': 'abcxyz'
  },
}

```

### Signin with an OAuth provider

Create a new Bit6 account or login into an existing one. In this example we use [Facebook Login](https://developers.facebook.com/docs/reference/javascript/FB.login/).

```js
FB.login(function(resp) {
  if (resp.authRespone) {
    // resp.authRespone object contains an authorization code or access token
    b6.oauth('facebook', resp.authRespone, function(err) {
      if (err) {
        console.log('oauth error', err);
      }
      else {
        console.log('login done');
      }
    });
  }
  else {
    console.log('User cancelled login or did not fully authorize.');
  }
});
```

For live OAuth2 demo, visit [videocalls.io](https://videocalls.io).
