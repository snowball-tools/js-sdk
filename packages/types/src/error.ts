export class SnowballError extends Error {
  /**
   * Because certain bundlers (webpack etc.) bundle duplicate copies of this code (somehow),
   * we can't rely on `instanceof` to check if an error is a SnowballError.
   * Instead, we use this key to check if an error is a SnowballError.
   * */
  protected _errorKey = 'SnowballError'

  static builder(name: string, message: string) {
    return (index: number, cause: any) => {
      return SnowballError.make(`${name}.${index}`, message, cause)
    }
  }

  static make(name: string, message: string, cause: unknown | string | Error) {
    if ((cause as any)._errorKey === 'SnowballError' && cause instanceof Error) {
      // Outer to inner
      cause.name = `${name}.${cause.name}`
      // Inner to outer
      cause.message = `[Snowball]${message[0] === '[' ? '' : ' '}${message}: ${cause.message.replace(/^\[Snowball\]/, '')}`
      return cause as SnowballError
    }
    return new SnowballError(name, message, typeof cause === 'string' ? new Error(cause) : cause)
  }

  constructor(
    public name: string,
    message: string,
    cause?: any,
  ) {
    super(`[Snowball]${message[0] === '[' ? '' : ' '}${message}`, { cause })
  }
}
