
export function isDef(s: any): boolean { return s !== undefined && s !== null; }

export function isUndef(s: any): boolean { return s === undefined; }

export const isArray = Array.isArray;

export function isPrimitive(s: any): s is (string | number) {
  return isString(s) || isNumber(s);
}

export function isBoolean(val: any): val is (boolean) { return typeof val === 'boolean'; }

export function isString(val: any): val is (string) { return typeof val === 'string'; }

export function isNumber(val: any): val is (number) { return typeof val === 'number'; }

export function toCamelCase(str: string) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

export function toDashCase(str: string) {
  return str.replace(/([A-Z])/g, (g) => `-${g[0].toLowerCase()}`);
}

export function getPropValue(propType: string, value: any): any {
  if (propType === 'boolean') {
    if (isString(value)) {
      return (value !== 'false')
    }
    return !!value;
  }

  if (propType === 'number') {
    if (isNumber(value)) {
      return value;
    }
    try {
      return parseFloat(value);
    } catch (e) {}
    return NaN;
  }

  return value;
}

export function noop(){};