import { DefinitionNode, DirectiveNode } from "graphql";
import { isNone, Maybe } from "./Maybe";

export const getLiveDirectiveNode = (
  input: DefinitionNode
): Maybe<DirectiveNode> => {
  if (input.kind !== "OperationDefinition" || input.operation !== "query") {
    return null;
  }
  const liveDirective = input.directives?.find((d) => d.name.value === "live");
  if (isNone(liveDirective)) {
    return null;
  }

  return liveDirective;
};
