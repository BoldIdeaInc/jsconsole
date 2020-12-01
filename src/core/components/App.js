import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import Console from './Console';
import Input from '../containers/Input';

import run, { bindConsole, createContainer, setContainer } from '../lib/run';
import internalCommands from '../lib/internal-commands';

// this is lame, but it's a list of key.code that do stuff in the input that we _want_.
const doStuffKeys = /^(Digit|Key|Num|Period|Semi|Comma|Slash|IntlBackslash|Backspace|Delete|Enter)/;

class App extends Component {
  constructor(props) {
    super(props);
    this.onRun = this.onRun.bind(this);
    this.triggerFocus = this.triggerFocus.bind(this);
  }

  async onRun(command) {
    const console = this.console;

    if (command[0] !== ':') {
      const event = new CustomEvent('jsconsole-run', {
        bubbles: true,
        cancelable: true,
        detail: { console, command }
      });
      this.app.dispatchEvent(event);
      if (event.defaultPrevented) return;

      console.push({
        type: 'command',
        command,
        value: command,
      });

      const res = await run(command);

      console.push({
        command,
        type: 'response',
        ...res,
      });
      return;
    }

    let [cmd, ...args] = command.slice(1).split(' ');

    if (/^\d+$/.test(cmd)) {
      args = [parseInt(cmd, 10)];
      cmd = 'history';
    }

    const event = new CustomEvent('jsconsole-run-internal', {
      bubbles: true,
      cancelable: true,
      detail: { console, args, command: cmd }
    });
    this.app.dispatchEvent(event);
    if (event.defaultPrevented) return;


    if (!internalCommands[cmd]) {
      console.push({
        command,
        error: true,
        value: new Error(`No such jsconsole command "${command}"`),
        type: 'response',
      });
      return;
    }

    let res = await internalCommands[cmd]({ args, console, app: this });

    if (typeof res === 'string') {
      res = { value: res };
    }

    if (res !== undefined) {
      console.push({
        command,
        type: 'log',
        ...res,
      });
    }

    return;
  }

  componentDidUpdate(prevProps) {
    if (prevProps.contextFrame !== this.props.contextFrame) {
      this.initFrame(this.props.contextFrame);
    }
  }

  initFrame(frame) {
    if (typeof frame !== 'undefined') {
      this.contextFrame = frame;
      // destroy proxy container if it exists
      const proxyContainer = document.querySelector('iframe[name="<proxy>"]');
      if (proxyContainer) proxyContainer.parentNode.removeChild(proxyContainer);
    }
    if (!this.contextFrame) {
      // create proxy container
      this.contextFrame = createContainer();
    }
    console.log('[jsconsole] initFrame: Binding console to frame', this.contextFrame);
    setContainer(this.contextFrame);
    bindConsole(this.console);

    // re-bind the console when the frame is reloaded. In order for this to work, the iframe
    // document must dispatch a custom event called "iframe-loadstart" at the top of the document,
    // so that the console can be bound as early as possible.
    this.contextFrame.addEventListener('iframe-loadstart', event => {
      this.console.clear();
      console.log('[jsconsole] iframe-loadstart: Binding console to frame', this.contextFrame);
      bindConsole(this.console);
    });
  }

  componentDidMount() {
    this.initFrame(this.props.contextFrame);

    const event = new CustomEvent('jsconsole-loaded', {
      bubbles: true,
      cancelable: true,
      detail: {
        app: this
      }
    });
    this.app.dispatchEvent(event);
    if (event.defaultPrevented) return;

    const query = decodeURIComponent(window.location.search.substr(1));
    if (query) {
      this.onRun(query);
    } else {
      this.onRun(':welcome');
    }
  }

  triggerFocus(e) {
    if (e.target.nodeName === 'INPUT') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.code && !doStuffKeys.test(e.code)) return;

    this.input.focus();
  }

  render() {
    const { commands = [], theme, layout } = this.props;

    const className = classnames(['App', `theme-${theme}`, layout]);

    return (
      <div
        tabIndex="-1"
        onKeyDown={this.triggerFocus}
        ref={e => (this.app = e)}
        className={className}
      >
        <Console
          ref={e => (this.console = e)}
          commands={commands}
          reverse={layout === 'top'}
        />
        <Input
          inputRef={e => (this.input = e)}
          onRun={this.onRun}
          autoFocus={window.top === window}
          onClear={() => {
            this.console.clear();
          }}
        />
      </div>
    );
  }
}

App.contextTypes = { store: PropTypes.object };

export default App;
