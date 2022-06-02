/**
 * FSM: Event-based finite state machines.
 *
 * @module evstate/index
 */
"use strict";

/**
 * A class representing the finite state machine.
 */
class FSM {
  /** A special identifier that should trigger on all states. */
  static ANY = 'anyStateChange'

  /**
   * Creates a new `FSM` instance.
   * @param {object} transitions - An object with keys for all the various state
   *     names, and values of all the states you can transition to from it.
   * @param {string} initialState - The default state the FSM starts in.
   */
  constructor(transitions, initialState) {
    this._allowedTransitions = transitions;
    this.currentState = initialState;
    this._errorHandler = null;

    this._knownStates = Object.keys(this._allowedTransitions);
    this._transitions = {};
    this._transitions[FSM.ANY] = [];

    for (let stateName of this._knownStates) {
      this._transitions[stateName] = [];
    }
  }

  /**
   * Adds a handler for a given state name.
   * @param {string} desiredState - The name of the state you wish to hook up
   *     behavior to.
   * @param {function} handler - A callable that accepts zero-to-many
   *     parameters, & performs an action(s) when the state transition occurs.
   * @return {this}
   */
  on(desiredState, handler) {
    if (desiredState !== FSM.ANY) {
      if (!this.isValid(desiredState)) {
        throw new Error(`Unable to hook up handler to unknown state ${desiredState}!`);
      }
    }

    if (!this._transitions.hasOwnProperty(desiredState)) {
      this._transitions[desiredState] = [];
    }

    this._transitions[desiredState].push(handler);
    return this;
  }

  /**
   * Removes a handler from a given state name.
   * @param {string} desiredState - The name of the state you wish to remove
   *     behavior from.
   * @param {function} handler - An already-registered callable function that
   *     you wish to remove.
   * @return {this}
   */
  off(desiredState, handler) {
    if (desiredState !== FSM.ANY) {
      if (!this.isValid(desiredState)) {
        throw new Error(`Unable to remove handler from unknown state ${desiredState}!`);
      }
    }

    if (!this._transitions.hasOwnProperty(desiredState)) {
      this._transitions[desiredState] = [];
    }

    const revisedHandlers = [];

    for (let existingHandler of this._transitions[desiredState]) {
      if (existingHandler !== handler) {
        revisedHandlers.push(existingHandler);
      }
    }

    this._transitions[desiredState] = revisedHandlers;
    return this;
  }

  /**
   * Adds an error handler to the finite state machine.
   * @param {function} handler - A callable that accepts a message when an
   *     error is encountered.
   * @return {this}
   */
  onError(handler) {
    this._errorHandler = handler;
    return this;
  }

  /**
   * Checks if the specified state name is a recognized/valid name.
   * @param {string} desiredState - The name of the state you wish to check.
   * @return {boolean}
   */
  isValid(desiredState) {
    return this._knownStates.indexOf(desiredState) >= 0;
  }

  /**
   * Checks if the specified state name can be transitioned to from the current
   * state.
   * @param {string} desiredState - The name of the state you wish to check.
   * @return {boolean}
   */
  canTransitionTo(desiredState) {
    return this._allowedTransitions[this.currentState].indexOf(desiredState) >= 0;
  }

  /**
   * Causes a transition from the current state to a new state, as well as
   * executing any handlers that may be setup for when this transition occurs.
   * @param {string} desiredState - The name of the state you wish transition to.
   * @param {args} args - Zero-to-many arguments to pass to the handlers.
   * @return {this}
   */
  emit(desiredState, ...args) {
    // First, check to make sure the desired state is a valid choice.
    if (!this.isValid(desiredState)) {
      this.handleError(`Invalid state requested: ${desiredState}`);
      return false;
    }

    // Next, check to make sure we're allowed to transition to that state.
    if (!this.canTransitionTo(desiredState)) {
      this.handleError(
        `Invalid transition from ${this.currentState} requested: ${desiredState}`
      );
      return false;
    }

    try {
      // Process the generic `ANY` handlers first.
      for (let anyHandler of this._transitions[FSM.ANY]) {
        anyHandler(...args);
      }

      // Then look for handlers specific to the state.
      for (let transitionHandler of this._transitions[desiredState]) {
        transitionHandler(...args);
      }

      // If the handlers didn't throw any errors, update the internal state.
      this.currentState = desiredState;
    } catch (err) {
      throw err;
    }

    return this;
  }

  // FIXME: I don't totally love this. Too coarse grained.
  handleError(msg) {
    if (this._errorHandler === null) {
      throw new Error(`No error handlers present: ${msg}`);
    }

    this._errorHandler(msg);
  }
}

export default FSM;
