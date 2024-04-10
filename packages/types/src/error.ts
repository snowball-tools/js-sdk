export class SnowballError extends Error {
  /**
   * Because certain bundlers (webpack etc.) bundle duplicate copies of this code (somehow),
   * we can't rely on `instanceof` to check if an error is a SnowballError.
   * Instead, we use this key to check if an error is a SnowballError.
   * */
  protected _errorKey = 'SnowballError'

  static builder(name: string, message: string) {
    return (index: number, details: any) => {
      return SnowballError.make(`${name}.${index}`, message, details)
    }
  }

  static make(name: string, message: string, details: any) {
    if (details._errorKey === 'SnowballError' && details instanceof Error) {
      // Outer to inner
      details.name = `${name}.${details.name}`
      // Inner to outer
      details.message = `[Snowball]${message[0] === '[' ? '' : ' '}${message}: ${details.message.replace(/^\[Snowball\]/, '')}`
      return details as SnowballError
    }
    return new SnowballError(name, message, details)
  }

  constructor(
    public name: string,
    message: string,
    public details?: any,
  ) {
    super(`[Snowball]${message[0] === '[' ? '' : ' '}${message}`)
  }
}
