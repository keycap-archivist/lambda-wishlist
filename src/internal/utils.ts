const NS_PER_SEC = 1e9;

export function readableHRTime(diff: [number, number]): string {
  return `${(diff[0] * NS_PER_SEC + diff[1]) / 1000000} ms`;
}

export async function readableToString(readable: NodeJS.ReadableStream): Promise<string> {
  let result = '';
  for await (const chunk of readable) {
    result += chunk;
  }
  return result;
}

export async function readableToBuffer(readable: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
