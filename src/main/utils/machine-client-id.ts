import { machineIdSync } from 'node-machine-id'

export function getMachineClientId(): string {
  const id = machineIdSync(true)
  return `bridge-${id.slice(0, 12)}` // short + stable
}
