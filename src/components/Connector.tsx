import { BaseEdge, type Edge, type EdgeProps } from "@xyflow/react";
export type FlowEdge = Edge<
  { path: string; blocked: boolean; tree: boolean },
  "orthogonal"
>;
export default function Connector({
  id,
  data,
  style,
  selected,
}: EdgeProps<FlowEdge>) {
  return (
    <>
      <BaseEdge
        id={id}
        path={data!.path}
        style={{
          ...style,
          stroke: selected ? "#437e70" : style?.stroke,
          strokeWidth: selected ? 3 : style?.strokeWidth,
        }}
        interactionWidth={18}
      />
      {data?.blocked && (
        <title>節點重疊或端點被遮擋，路徑無法完全避障；請分開節點。</title>
      )}
    </>
  );
}
