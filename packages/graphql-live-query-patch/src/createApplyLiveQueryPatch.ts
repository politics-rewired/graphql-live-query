import { ExecutionResult } from "graphql";
import { ExecutionLivePatchResult } from "./ExecutionLivePatchResult";

export type ApplyPatchFunction<PatchPayload = unknown> = (
  previous: Record<string, unknown>,
  patch: PatchPayload
) => Record<string, unknown>;

/**
 * Create a middleware generator function for applying live query patches on the client.
 */
export const createApplyLiveQueryPatch = <PatchPayload = unknown>(
  /* Function which is used for generating the patches */
  applyPatch: ApplyPatchFunction<PatchPayload>
) => {
  return async function* applyLiveQueryPatch<
    TExecutionResult = Record<string, unknown>
  >(
    asyncIterable: AsyncIterableIterator<TExecutionResult>
  ): AsyncIterableIterator<TExecutionResult> {
    let mutableData: ExecutionResult | null = null;
    let lastRevision = 0;

    for await (const result of asyncIterable as AsyncIterableIterator<
      ExecutionLivePatchResult<PatchPayload>
    >) {
      // no revision means this is no live query patch.
      if ("revision" in result && result.revision) {
        const valueToPublish: ExecutionLivePatchResult = {};

        if (result.revision === 1) {
          if (!result.data) {
            throw new Error("Missing data.");
          }
          valueToPublish.data = result.data;
          mutableData = result.data;
          lastRevision = 1;
        } else {
          if (!mutableData) {
            throw new Error("No previousData available.");
          }
          if (!result.patch) {
            throw new Error("Missing patch.");
          }
          if (lastRevision + 1 !== result.revision) {
            throw new Error("Wrong revision received.");
          }

          mutableData = applyPatch(
            mutableData as Record<string, unknown>,
            result.patch
          );
          valueToPublish.data = mutableData as Record<string, unknown>;

          lastRevision++;
        }

        if (result.extensions) {
          valueToPublish.extensions = result.extensions;
        }
        if (result.errors) {
          valueToPublish.errors = result.errors;
        }

        yield valueToPublish as TExecutionResult;
        continue;
      }

      yield result as TExecutionResult;
      yield* asyncIterable;
    }
  };
};
