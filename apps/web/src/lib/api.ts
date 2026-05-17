export type PingResponse = {
  message: string
}

export async function fetchPing(signal?: AbortSignal): Promise<PingResponse> {
  const response = await fetch('/api/v1/ping', { signal })

  if (!response.ok) {
    throw new Error(`Ping failed with status ${response.status}`)
  }

  return (await response.json()) as PingResponse
}
