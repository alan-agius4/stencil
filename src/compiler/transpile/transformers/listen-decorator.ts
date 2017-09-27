import { catchError } from '../../util';
import { Diagnostic, ListenMeta, ListenOptions } from '../../../util/interfaces';
import * as ts from 'typescript';


export function getListenDecoratorMeta(tsFilePath: string, diagnostics: Diagnostic[], classNode: ts.ClassDeclaration): ListenMeta[] {
  const listenersMeta: ListenMeta[] = [];
  const decoratedMembers = classNode.members.filter(n => n.decorators && n.decorators.length);

  decoratedMembers.forEach(memberNode => {
    let isListen = false;
    let methodName: string = null;
    let eventName: string = null;
    let rawListenOpts: ListenOptions = {};

    memberNode.forEachChild(n => {
      if (n.kind === ts.SyntaxKind.Decorator &&
          n.getChildCount() > 1 &&
          n.getChildAt(1).getFirstToken() &&
          n.getChildAt(1).getFirstToken().getText() === 'Listen') {
        isListen = true;

        n.getChildAt(1).forEachChild(n => {

          if (n.kind === ts.SyntaxKind.StringLiteral && !eventName) {
            eventName = n.getText().replace(/\s/g, '');
            eventName = eventName.replace(/\'/g, '');
            eventName = eventName.replace(/\"/g, '');
            eventName = eventName.replace(/\`/g, '');

          } else if (n.kind === ts.SyntaxKind.ObjectLiteralExpression && eventName) {
            try {
              const fnStr = `return ${n.getText()};`;
              Object.assign(rawListenOpts, new Function(fnStr)());

            } catch (e) {
              const d = catchError(diagnostics, e);
              d.messageText = `parse listener options: ${e}`;
              d.absFilePath = tsFilePath;
            }
          }
        });

      } else if (isListen) {
        if (n.kind === ts.SyntaxKind.Identifier && !methodName) {
          methodName = n.getText().trim();
        }
      }
    });


    if (isListen && eventName && methodName) {
      eventName.split(',').forEach(evName => {
        const listenMeta = validateListener(tsFilePath, evName, rawListenOpts, methodName);

        if (listenMeta) {
          listenersMeta.push(listenMeta);
          memberNode.decorators = undefined;
        }
      });
    }
  });

  return listenersMeta.sort((a, b) => {
    if (a.eventName.toLowerCase() < b.eventName.toLowerCase()) return -1;
    if (a.eventName.toLowerCase() > b.eventName.toLowerCase()) return 1;
    if (a.eventMethodName.toLowerCase() < b.eventMethodName.toLowerCase()) return -1;
    if (a.eventMethodName.toLowerCase() > b.eventMethodName.toLowerCase()) return 1;
    return 0;
  });
}


export function validateListener(tsFilePath: string, eventName: string, rawListenOpts: ListenOptions, methodName: string): ListenMeta | null {
  eventName = eventName && eventName.trim();
  if (!eventName) return null;

  let rawEventName = eventName;

  let splt = eventName.split(':');
  if (splt.length > 2) {
    throw `@Listen can only contain one colon: ${eventName} in ${tsFilePath}`;
  }
  if (splt.length > 1) {
    let prefix = splt[0].toLowerCase().trim();
    if (!isValidElementRefPrefix(prefix)) {
      throw `invalid @Listen prefix "${prefix}" for "${eventName}" in ${tsFilePath}`;
    }
    rawEventName = splt[1].toLowerCase().trim();
  }

  splt = rawEventName.split('.');
  if (splt.length > 2) {
    throw `@Listen can only contain one period: ${eventName} in ${tsFilePath}`;
  }
  if (splt.length > 1) {
    let suffix = splt[1].toLowerCase().trim();
    if (!isValidKeycodeSuffix(suffix)) {
      throw `invalid @Listen suffix "${suffix}" for "${eventName}" in ${tsFilePath}`;
    }
    rawEventName = splt[0].toLowerCase().trim();
  }

  const listenMeta: ListenMeta = {
    eventName: eventName,
    eventMethodName: methodName
  };

  if (typeof rawListenOpts.capture === 'boolean') {
    listenMeta.eventCapture = rawListenOpts.capture;
  } else {
    // default to not use capture if it wasn't provided
    listenMeta.eventCapture = false;
  }

  if (typeof rawListenOpts.passive === 'boolean') {
    listenMeta.eventPassive = rawListenOpts.passive;

  } else {
    // they didn't set if it should be passive or not
    // so let's figure out some good defaults depending
    // on what type of event this is

    if (PASSIVE_TRUE_DEFAULTS.indexOf(rawEventName.toLowerCase()) > -1) {
      // good list of known events that we should default to passive
      listenMeta.eventPassive = true;

    } else {
      // play it safe and have all others default to NOT be passive
      listenMeta.eventPassive = false;
    }
  }

  // default to enabled=true if it wasn't provided
  listenMeta.eventDisabled = (rawListenOpts.enabled === false);

  return listenMeta;
}


export function isValidElementRefPrefix(prefix: string) {
  return (VALID_ELEMENT_REF_PREFIXES.indexOf(prefix) > -1);
}


export function isValidKeycodeSuffix(prefix: string) {
  return (VALID_KEYCODE_SUFFIX.indexOf(prefix) > -1);
}


const PASSIVE_TRUE_DEFAULTS = [
  'dragstart', 'drag', 'dragend', 'dragenter', 'dragover', 'dragleave', 'drop',
  'mouseenter', 'mouseover', 'mousemove', 'mousedown', 'mouseup', 'mouseleave', 'mouseout', 'mousewheel',
  'pointerover', 'pointerenter', 'pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'pointerout', 'pointerleave',
  'resize',
  'scroll',
  'touchstart', 'touchmove', 'touchend', 'touchenter', 'touchleave', 'touchcancel',
  'wheel',
];


const VALID_ELEMENT_REF_PREFIXES = [
  'child', 'parent', 'body', 'document', 'window'
];


const VALID_KEYCODE_SUFFIX = [
  'enter', 'escape', 'space', 'tab', 'up', 'right', 'down', 'left'
];
