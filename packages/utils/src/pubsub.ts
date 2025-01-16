export type PubSub = ReturnType<typeof makePubSub>

export function makePubSub<T extends Array<any> = []>() {
  const subscribers = new Set<Function>()

  return {
    subscribe(cb: (...args: T) => void) {
      subscribers.add(cb)
      return () => {
        subscribers.delete(cb)
      }
    },
    publish(...args: T) {
      subscribers.forEach((cb) => cb(...args))
    },
  }
}
