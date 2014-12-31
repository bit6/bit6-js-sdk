---
category: authentication
title: 'Username'
---

A username is case-insensitive and must consist of alphanumeric characters, e.g. `usr:john` or  `usr:test123`.

### Create user account

Create a new user account with a username identity and a password.

```js
// Convert username to an identity URI
var ident = 'usr:' + 'john';
b6.signup({identity: ident, password: 'secret'}, function(err) {
  if (err) {
    console.log('signup error', err);
  }
  else {
    console.log('signup successful');
  }
});
```

### Login

Login into an existing account using an Identity and a password.

```js
// Convert username to an identity URI
var ident = 'usr:' + 'john';
b6.login({identity: ident, password: 'secret'}, function(err) {
  if (err) {
    console.log('login error', err);
  }
  else {
    console.log('login successful');
  }
});
```
