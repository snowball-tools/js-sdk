export function makePubSub() {
  const subscribers = new Set<Function>()

  return {
    subscribe(cb: Function) {
      subscribers.add(cb)
      return () => {
        subscribers.delete(cb)
      }
    },
    publish() {
      subscribers.forEach((cb) => cb())
    },
  }
}
