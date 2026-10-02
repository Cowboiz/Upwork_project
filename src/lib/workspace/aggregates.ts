export type ActiveCountResult = {
  activeCount?: number;
  error: null | string;
};

export function getAggregateActiveCount(result: ActiveCountResult) {
  if (result.error) {
    return 0;
  }

  return result.activeCount ?? 0;
}
