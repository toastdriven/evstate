# `evstate`

Event-based finite state machines.


## Quickstart

```js
import FSM from 'evstate';

const publishWorkflow = new FSM(
  {
    'draft': ['inReview'],
    'inReview': ['changesNeeded', 'approved'],
    'changesNeeded': ['inReview', 'approved'],
    'approved': ['draft', 'scheduled', 'published'],
    'scheduled': ['draft', 'published'],
    'published': null,
  },
  'draft'
);

// Add (optional) behavior when state changes happen.
publishWorkflow
  .on(FSM.ANY, (obj) => {
    obj.state = publishWorkflow.currentState;
  })
  .on('inReview', (obj) => {
    // Send a notification to a reviewer.
    emailReviewer(obj);
  })
  .on('changesNeeded', (obj) => {
    // Send a notification to the author to make changes.
    emailAuthor(obj);
  })
  .on('published', (obj) => {
    obj.publishDate = new Date();
  })
  .onError((msg) => {
    console.log(msg);
  });

// Create a draft.
// This is a plain old Object, but could be a Model or anything else!
const firstPost = {
  title: 'Hello World!',
  content: 'This is my very first PASTE to the website!',
  state: publishWorkflow.currentState,
  created: new Date(),
);

// Get a reviewer to look.
publishWorkflow.emit('inReview', firstPost);

// Oops! There was a typo!
publishWorkflow.emit('changesNeeded', firstPost);

// The author fixes it.
firstPost.content = 'This is my very first post to the website!';
publishWorkflow.emit('inReview', firstPost);

// Reviewer approves it!
publishWorkflow.emit('approved', firstPost);

// Somebody makes a mistake & tries to put it back in review!
// This logs a console error & DOES NOT save the change to the post!
publishWorkflow.emit('inReview', firstPost);

// Editor checks the list of stories ready to go...
// ...and says it's time to publish the first one!
publishWorkflow.emit('published', firstPost);
```


## Installation

`$ npm install evstate`


## Requirements

* ES6 (or similar translation/polyfill)


## Tests

`$ npm test`


## Docs

`$ jsdoc -r -d ~/Desktop/out --package package.json --readme README.md src`


## License

New BSD
