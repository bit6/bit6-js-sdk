---
category: session
title: 'Overview'
---

Each user in the system has one or more identities - user id, username, email, facebook id, google account, phone number etc. Identities are required for user authentication, managing contacts, identifying user's network. An identity is represented by a URI.

Bit6 supports various authentication mechanisms described in the following sections. 

### Check if the user is logged in

```js
if (b6.isLoggedIn()) {
  console.log('User is logged in');
}
else {
  console.log('User is not logged in');
}
```

### Logout

```js
b6.logout();
```

