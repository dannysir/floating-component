import { TreeLayout, useLayoutTree } from "../index";
import type { LayoutNode } from "../types";
import { PanelA } from "../testComponents/PanelA";
import { PanelB } from "../testComponents/PanelB";
import { PanelC } from "../testComponents/PanelC";
import { PanelD } from "../testComponents/PanelD";

/**
 * 렌더링 트리 구조:
 *
 * split horizontal
 * ├── split vertical
 * │   ├── A
 * │   └── split horizontal
 * │       ├── B
 * │       └── C
 * └── D
 */
const initialTree: LayoutNode = {
  type: "split",
  direction: "horizontal",
  children: [
    {
      type: "split",
      direction: "vertical",
      children: [
        { type: "panel", id: "panel-a", size: 1, component: <PanelA /> },
        {
          type: "split",
          direction: "horizontal",
          children: [
            { type: "panel", id: "panel-b", size: 1, component: <PanelB /> },
            { type: "panel", id: "panel-c", size: 1, component: <PanelC /> },
          ],
        },
      ],
    },
    { type: "panel", id: "panel-d", size: 1, component: <PanelD /> },
  ],
};

const App = () => {
  const { tree } = useLayoutTree(initialTree);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <TreeLayout tree={tree} />
    </div>
  );
};

export default App;
