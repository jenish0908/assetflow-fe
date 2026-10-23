import type { Allocation, AssetWithAllocations } from "../api/types";

/** The current holder is the newest allocation that has not been returned. */
export function currentHolder(a: AssetWithAllocations): Allocation | undefined {
  return a.allocations.find((al) => !al.returned_at);
}
