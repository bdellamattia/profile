import { SnapScreen } from "./SnapScreen";

// Rendered in the browser only (see ClientOnly in the layout), nothing to validate on the server.
export const instant = false;

export default function Page() {
  return <SnapScreen />;
}
