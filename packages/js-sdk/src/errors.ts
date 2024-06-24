export function consoleLogError(error: Error) {
  let errors: any[] = [error]
  let safety = 0
  while (errors[errors.length - 1].cause && safety < 100) {
    errors.push('::caused by::', errors[errors.length - 1].cause)
    safety += 1
  }
  console.error(...errors)
}
