---
title: 'Authentication'
layout: nil
---

### Create user account

Create a new user account with a username identity.

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

### Logout

```js
b6.logout();
```

### Check if the user is logged in

```js
if (b6.isLoggedIn()) {
  console.log('User is logged in');
}
else {
  console.log('User is not logged in');
}
```
