import React, { Component } from 'react';

import StackTracey from 'stacktracey';

class ErrorType extends Component {
  constructor(props) {
    super(props);
    this.state = {
      open: props.open,
    };
  }

  formatStackItem(item) {
    const fileName = item.fileName || '<anonymous>';
    let location = fileName;
    if (item.line) location += `:${item.line}`;
    if (item.column) location += `:${item.column}`;
    if (item.callee) {
      return location ? `in ${item.callee} (${location})` : `in ${item.callee}`;
    } else {
      return `at ${location}`;
    }
  }

  render() {
    const { value } = this.props;
    const { open } = this.state;
    const displayName = value.name || value.constructor.name;
    const type = 'error';

    let locationInfo;
    if (!value.__ignoreLocation && value.fileName) {
      locationInfo = value.fileName.replace(/\/$/, '').split('/').pop();
      if (value.lineNumber) locationInfo += `:${value.lineNumber}`;
      if (value.columnNumber) locationInfo += `:${value.columnNumber}`;
    }

    let stackEl;
    if (!value.__ignoreStack) {
      const stack = new StackTracey(value.stack);
      stackEl = (
        <div className="group">
          {stack.items.map((item, i) => {
            return (
              <div className="error-stack-item">{this.formatStackItem(item)}</div>
            );
          })}
        </div>
      );
    }

    return (
      <div className={`type ${type}`}>
        <div className="header">
          <span className="message">{displayName}: {value.message}</span>
          <span className="location-info">
            {locationInfo}
          </span>
        </div>
        {stackEl}
      </div>
    );
  }
}

export default ErrorType;
