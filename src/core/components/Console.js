import React, { Component } from 'react';
import Line from './Line';
import cloneDeep from 'lodash/cloneDeep';

let guid = 0;
const getNext = () => guid++;

function AssertError(message) {
  this.name = 'Assertion fail';
  this.message = message;
  this.stack = new Error().stack;
}

AssertError.prototype = new Error();

function interpolate(...args) {
  let [string, ...rest] = args;
  let html = false;

  if (typeof string === 'string' && string.includes('%') && rest.length) {
    string = string.replace(
      /(%[scdif]|%(\d*)\.(\d*)[dif])/g,
      (all, key, width = '', dp) => {
        // NOTE: not supporting Object type

        if (key === '%s') {
          // string
          return rest.shift();
        }

        if (key === '%c') {
          html = true;
          return `</span><span style="${rest.shift()}">`;
        }

        const value = rest.shift();
        let res = null;

        if (key.substr(-1) === 'f') {
          if (isNaN(parseInt(dp, 10))) {
            res = value;
          } else {
            res = value.toFixed(dp);
          }
        } else {
          res = parseInt(value, 10);
        }

        if (width === '') {
          return res;
        }

        return res.toString().padStart(width, ' ');
      }
    );

    if (html) {
      string = `<span>${string}</span>`;
    }

    args = [string, ...rest];
  }

  return { html, args };
}

class Console extends Component {
  constructor(props) {
    super(props);
    this.state = (props.commands || []).reduce((acc, curr) => {
      acc[getNext()] = curr;
      return acc;
    }, {});
    this.log = this.log.bind(this);
    this.clear = this.clear.bind(this);
    this.push = this.push.bind(this);
  }

  push(command) {
    const event = new CustomEvent('jsconsole-push', {
      bubbles: true,
      cancelable: true,
      detail: {
        command: command
      }
    });
    this.el.dispatchEvent(event);
    if (event.defaultPrevented) return;

    const next = getNext();
    this.setState({ [next]: command });
  }

  clear() {
    this.state = {}; // eslint-disable-line react/no-direct-mutation-state
    this.forceUpdate();
    // Hide the console for a brief period of time, giving some visual indication that the console
    // has cleared. This is useful in situations when the console clears on page reload, and the
    // page is generating the same logs.
    this.el.style.display = 'none';
    setTimeout(() => {
      this.el.style.display = '';
    }, 200);
  }

  error = (...rest) => {
    const { html, args } = interpolate(...rest);
    this.push({
      error: true,
      html,
      value: cloneDeep(args),
      type: 'log',
    });
  };

  assert(test, ...rest) {
    // intentional loose assertion test - matches devtools
    if (!test) {
      let msg = rest.shift();
      if (msg === undefined) {
        msg = 'console.assert';
      }
      rest.unshift(new AssertError(msg));
      this.push({
        error: true,
        value: cloneDeep(rest),
        type: 'log',
      });
    }
  }

  dir = (...rest) => {
    const { html, args } = interpolate(...rest);

    this.push({
      value: cloneDeep(args),
      html,
      open: true,
      type: 'log',
    });
  };

  warn(...rest) {
    const { html, args } = interpolate(...rest);
    this.push({
      error: true,
      level: 'warn',
      html,
      value: cloneDeep(args),
      type: 'log',
    });
  }

  debug = (...args) => this.log(...args);
  info = (...args) => this.log(...args);

  log(...rest) {
    const { html, args } = interpolate(...rest);

    this.push({
      value: cloneDeep(args),
      html,
      type: 'log',
    });
  }

  render() {
    const commands = this.state || {};
    const keys = Object.keys(commands);
    if (this.props.reverse) {
      keys.reverse();
    }

    return (
      <div
        className="react-console-container"
        ref={e => (this.el = e)}
        onClick={e => {
          e.stopPropagation(); // prevent the focus on the input element
        }}
      >
        {keys.map(_ => <Line key={`line-${_}`} {...commands[_]} />)}
      </div>
    );
  }
}

export default Console;
