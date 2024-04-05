export class SnowballError extends Error {
  static builder(name: string, message: string) {
    return (index: number, details: any) => {
      if (details instanceof SnowballError) {
        details.name = `${name}.${index}.${details.name}`
        return details
      }
      name = `${name}.${index}`
      return new SnowballError(message, name, details)
    }
  }

  constructor(
    message: string,
    public name: string,
    public details?: any,
  ) {
    super(`[Snowball]${message}`)
  }
}
