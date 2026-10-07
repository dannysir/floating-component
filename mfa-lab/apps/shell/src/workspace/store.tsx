import { createComponentStore } from '@dannysir/floating-components';
import { PanelFrame } from './PanelFrame';
import { Bare } from '../local/Bare';
import { ControlPanel } from '../local/ControlPanel';
import { NavPanel } from '../local/NavPanel';
import { RemoteMount } from '../adapters/RemoteMount';
import { BillingTwin } from '../local/twins';
// B1-05 부터: import { IframeRemote } from '../adapters/IframeRemote';
// B1-06 부터: import { SameTreeRemote } from '../adapters/SameTreeRemote'; import { OrdersTwin } from '../local/twins';
// B1-07 부터: import { BoardTwin } from '../local/twins';
import { bus } from '../bus';

const control = (slot: string) => (
  <PanelFrame slot={slot} kind="local" title={slot} team="workspace-platform"><ControlPanel slot={slot} /></PanelFrame>
);

export const components = createComponentStore({
  nav: <PanelFrame slot="nav" kind="local" title="Nav" team="workspace-platform"><NavPanel /></PanelFrame>,
  'bare-0': <Bare slot="bare-0" />, 'bare-1': <Bare slot="bare-1" />, 'bare-2': <Bare slot="bare-2" />, 'bare-3': <Bare slot="bare-3" />,
  'control-a': control('control-a'), 'control-b': control('control-b'), 'control-c': control('control-c'), 'control-d': control('control-d'),
  // B1-04
  'control-mount': <PanelFrame slot="control-mount" kind="mount" title="control-mount" team="workspace-platform"><RemoteMount slot="control-mount" /></PanelFrame>,
  billing: <PanelFrame slot="billing" kind="mount" title="Billing" team="billing"><RemoteMount slot="billing" /></PanelFrame>,
  'billing-local': <PanelFrame slot="billing-local" kind="local" title="billing-local" team="billing"><BillingTwin slot="billing-local" bus={bus} /></PanelFrame>,
  // B1-05
  // 'control-iframe': <PanelFrame slot="control-iframe" kind="iframe" title="control-iframe" team="workspace-platform"><IframeRemote slot="control-iframe" /></PanelFrame>,
  // telemetry: <PanelFrame slot="telemetry" kind="iframe" title="Telemetry" team="telemetry"><IframeRemote slot="telemetry" /></PanelFrame>,
  // 'telemetry-x': <PanelFrame slot="telemetry-x" kind="iframe" title="Telemetry (cross-site)" team="telemetry"><IframeRemote slot="telemetry-x" /></PanelFrame>,
  // B1-06
  // orders: <PanelFrame slot="orders" kind="same-tree" title="Orders" team="order-desk"><SameTreeRemote slot="orders" /></PanelFrame>,
  // 'orders-local': <PanelFrame slot="orders-local" kind="local" title="orders-local" team="order-desk"><OrdersTwin slot="orders-local" bus={bus} /></PanelFrame>,
  // B1-07
  // board: <PanelFrame slot="board" kind="same-tree" title="Board" team="fulfilment"><SameTreeRemote slot="board" /></PanelFrame>,
  // 'board-local': <PanelFrame slot="board-local" kind="local" title="board-local" team="fulfilment"><BoardTwin slot="board-local" bus={bus} /></PanelFrame>,
});
