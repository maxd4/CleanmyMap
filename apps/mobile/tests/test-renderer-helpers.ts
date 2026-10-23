import type { ReactTestInstance } from 'react-test-renderer'

type TestProps = Record<string, unknown>
type TestHandler = (...args: unknown[]) => unknown

export function testProps(instance: ReactTestInstance): TestProps {
  return instance.props as TestProps
}

export function testProp<T>(instance: ReactTestInstance | undefined, name: string): T | undefined {
  return instance ? testProps(instance)[name] as T | undefined : undefined
}

export function callTestHandler(
  instance: ReactTestInstance | undefined,
  name: string,
  ...args: unknown[]
): unknown {
  const handler = testProp<TestHandler>(instance, name)
  if (!handler) return undefined
  return handler(...args)
}
