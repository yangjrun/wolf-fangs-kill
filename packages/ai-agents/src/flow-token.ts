/**
 * Async-flow guard token. Pass into long-running operations; if the flow
 * (game, session) becomes invalid mid-call, results can be safely discarded.
 *
 * Pattern (Wolfcha-inspired):
 *
 *   const token = new FlowToken();
 *   const result = await llm.call(...);
 *   if (!token.isValid()) return;  // game restarted, drop this result
 *   applyResult(result);
 */
export class FlowToken {
  private valid = true;

  invalidate(): void {
    this.valid = false;
  }

  isValid(): boolean {
    return this.valid;
  }
}
