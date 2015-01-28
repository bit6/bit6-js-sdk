---
category: authentication
title: 'Session'
---

To use calling and messaging capabilities of the SDK, the user needs to be authenticated. 

Bit6 supports various authentication mechanisms described in the following sections. They are part of the `Session` class.

Each user can have one or more identities - user id, username, email, facebook id, google account, phone number etc. Identities are required for user authentication, managing contacts, identifying user's network. An identity is represented by a URI.

### Check if the user is authenticated

```js
if (b6.session.authenticated) {
  console.log('User is logged in');
}
else {
  console.log('User is not logged in');
}
```

### Logout

```js
b6.session.logout();
```
