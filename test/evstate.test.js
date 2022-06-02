import assert from "assert";

import FSM from "../src/index.js";

describe("FSM", function () {
  describe("constructor", function () {
    it("sets internal state", function () {
      const fsm = new FSM(
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

      assert.equal(fsm.currentState, 'draft');
      assert.equal(fsm._errorHandler, null);

      assert.equal(fsm._knownStates.length, 6)
      assert.equal(fsm._knownStates[0], 'draft');
      assert.equal(fsm._knownStates[1], 'inReview');
      assert.equal(fsm._knownStates[2], 'changesNeeded');
      assert.equal(fsm._knownStates[3], 'approved');
      assert.equal(fsm._knownStates[4], 'scheduled');
      assert.equal(fsm._knownStates[5], 'published');

      assert.equal(fsm._transitions[FSM.ANY].length, 0);
      assert.equal(fsm._transitions['draft'].length, 0);
    });
  });

  describe("on", function () {
    it("correctly registers handlers", function () {
      const fsm = new FSM(
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

      assert.equal(fsm._transitions['inReview'].length, 0);

      fsm.on('inReview', (obj) => {
        // We're not exercising the handler here.
      });

      assert.equal(fsm._transitions['inReview'].length, 1);

      // Verify the chaining as well.
      fsm
        .on('inReview', (obj) => {
          console.log("Another handler! Oh my!");
        })
        .on('approved', (obj) => {
          obj.publishIt();
        });

      assert.equal(fsm._transitions['draft'].length, 0);
      assert.equal(fsm._transitions['inReview'].length, 2);
      assert.equal(fsm._transitions['approved'].length, 1);
    });
  });

  describe("off", function () {
    it("correctly removes handlers", function () {
      const fsm = new FSM(
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

      // Define a handler.
      const sampleHandler = (obj) => {
        console.log("YOLO");
      }

      // Register it & sanity-check state.
      assert.equal(fsm._transitions['inReview'].length, 0);
      fsm.on('inReview', sampleHandler);
      assert.equal(fsm._transitions['inReview'].length, 1);

      // Now to test the actual de-registration behavior.
      fsm.off('inReview', sampleHandler);
      assert.equal(fsm._transitions['inReview'].length, 0);

      // And call it again, to make sure it quietly no-ops.
      fsm.off('inReview', sampleHandler);
      assert.equal(fsm._transitions['inReview'].length, 0);
    });
  });

  describe("isValid", function () {
    it("identifies if a state name is valid or not", function () {
      const fsm = new FSM(
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

      assert.equal(fsm.isValid('draft'), true);
      assert.equal(fsm.isValid('published'), true);

      assert.equal(fsm.isValid('nopenopenope'), false);
    });
  });

  describe("canTransitionTo", function () {
    it("determines if a transition is allowed from the current state", function () {
      const fsm = new FSM(
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

      assert.equal(fsm.currentState, 'draft');
      assert.equal(fsm.canTransitionTo('inReview'), true);
      assert.equal(fsm.canTransitionTo('published'), false);

      fsm.emit('inReview', {});
      assert.equal(fsm.currentState, 'inReview');
      assert.equal(fsm.canTransitionTo('changesNeeded'), true);
      assert.equal(fsm.canTransitionTo('approved'), true);
      assert.equal(fsm.canTransitionTo('scheduled'), false);
    });
  });

  describe("emit", function () {
    it("emits a state transition & executes behavior properly", function () {
      const fsm = new FSM(
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
      let timesInReview = 0;

      fsm.on('inReview', (obj) => {
        obj.state = 'in_review';
        timesInReview++;
      });

      const fakePost = {
        title: 'O HAI',
        state: 'draft',
      }

      assert.equal(fsm.currentState, 'draft');
      assert.equal(fsm.canTransitionTo('inReview'), true);

      fsm.emit('inReview', fakePost);
      assert.equal(fsm.currentState, 'inReview');
      assert.equal(fakePost.state, 'in_review');
      assert.equal(timesInReview, 1);

      // Send it back.
      fsm.emit('changesNeeded', fakePost);
      assert.equal(fsm.currentState, 'changesNeeded');
      assert.equal(timesInReview, 1);

      // And back again.
      fsm.emit('inReview', fakePost);
      assert.equal(fsm.currentState, 'inReview');
      assert.equal(timesInReview, 2);
    });
  });

  describe("handleError", function () {
    it("handles errors correctly", function () {
      const fsm = new FSM(
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

      // Without a handler.
      assert.throws(() => fsm.emit('nopenopenope', {}));

      // And with a handler.
      let sawMsg = "";
      fsm.onError((msg) => {
        sawMsg = msg;
      });

      // This quietly errors, thanks to the above.
      fsm.emit('nopenopenope', {});
      assert.equal(sawMsg, "Invalid state requested: nopenopenope");
    });
  });

  describe("validTransitions", function () {
    it("tests integration, as well as the README Quickstart", function () {
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

      // Some mock behaviors to call.
      let emailsSent = 0;
      const emailReviewer = (obj) => {
        emailsSent += 1;
      };
      const emailAuthor = (obj) => {
        emailsSent += 1;
      };
      const fakeOutput = [];
      const mockConsoleLog = (msg) => {
        fakeOutput.push(msg);
      }

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
          mockConsoleLog(msg);
        });

      // Create a draft.
      const firstPost = {
        title: 'Hello World!',
        content: 'This is my very first PASTE to the website!',
        state: publishWorkflow.currentState,
        created: new Date(),
      };

      // Get a reviewer to look.
      publishWorkflow.emit('inReview', firstPost);

      // Oops! There was a typo!
      publishWorkflow.emit('changesNeeded', firstPost);

      // The author fixes it.
      firstPost.content = 'This is my very first post to the website!';
      publishWorkflow.emit('inReview', firstPost);

      // Reviewer approves it!
      publishWorkflow.emit('approved', firstPost);
      mockConsoleLog(publishWorkflow.currentState);

      // Somebody makes a mistake & tries to put it back in review!
      // This logs a console error & DOES NOT save the change to the post!
      publishWorkflow.emit('inReview', firstPost);
      mockConsoleLog(publishWorkflow.currentState);

      // Editor checks the list of stories ready to go...
      // ...and says it's time to publish the first one!
      publishWorkflow.emit('published', firstPost);
      mockConsoleLog(publishWorkflow.currentState);
    });
  });
});
