---
category: messaging
title: 'Groups'
---

### Get a Group

```js
var g = b6.getGroup(id);
```

### Create a Group

Create a new group. The current user will become the group administrator.

```js
// Group information - meta data, permissions
var opts = {
  meta: {
    title: 'Hello World'
  }
};
// Create the group
b6.createGroup(opts, function(err, g) {
  if (err) {
    console.log('error', err);
  }
  else {
    console.log('created group', g);
  }
});
```

### Join a Group

```js
// Join group 'g1' with role 'user'
b6.joinGroup('g1', 'user', function(err, g) {
  if (err) {
    console.log('error', err);
  }
  else {
    console.log('joined group', g);
  }
});
```

### Leave a Group

```js
// Leave group 'g1'
b6.leaveGroup('g1', function(err) {
  if (err) {
    console.log('error', err);
  }
  else {
    console.log('left group');
  }
});
```
