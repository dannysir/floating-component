import { TreeLayout, useLayoutTree } from "../index";
import type { LayoutTree } from "../types";
import { PanelA } from "../testComponents/PanelA";
import { PanelB } from "../testComponents/PanelB";
import { PanelC } from "../testComponents/PanelC";
import { PanelD } from "../testComponents/PanelD";

/**
 * 렌더링 트리 구조:
 *
 * split 세로 (vertical) 50:50
 * ├── split 가로 (horizontal) 50:50
 * │   ├── A
 * │   └── split 세로 (vertical) 50:50
 * │       ├── B
 * │       └── C
 * └── D
 */
const initialTree: LayoutTree = {
  root: {
    id: "split-root",
    type: "split",
    direction: "horizontal",
    children: [
      {
        id: "split-top",
        type: "split",
        direction: "vertical",
        children: [
          { id: "panel-a", type: "panel", size: 1 },
          {
            id: "split-bc",
            type: "split",
            direction: "horizontal",
            children: [
              { id: "panel-b", type: "panel", size: 1 },
              { id: "panel-c", type: "panel", size: 1 },
            ],
          },
        ],
      },
      { id: "panel-d", type: "panel", size: 1 },
    ],
  },
};

const panels: Record<string, React.ReactNode> = {
  "panel-a": <PanelA />,
  "panel-b": <PanelB />,
  "panel-c": <PanelC />,
  "panel-d": <PanelD />,
};

export default function App() {
  const { tree } = useLayoutTree(initialTree);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <TreeLayout
        node={tree.root}
        renderPanel={(id) => panels[id] ?? <div>{id}</div>}
      />
    </div>
  );
}
