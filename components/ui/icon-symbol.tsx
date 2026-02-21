import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "person.2.fill": "group",
  "chart.bar.fill": "bar-chart",
  "square.grid.2x2.fill": "grid-view",
  "arrow.up.arrow.down": "swap-vert",
  "doc.text.fill": "description",
  "checkmark.circle.fill": "check-circle",
  "xmark.circle.fill": "cancel",
  "plus.circle.fill": "add-circle",
  "pencil": "edit",
  "trash": "delete",
  "chevron.down": "expand-more",
  "chevron.up": "expand-less",
  "info.circle": "info",
  "arrow.down.doc": "download",
  "building.2.fill": "business",
  "person.fill": "person",
  "star.fill": "star",
  "exclamationmark.triangle.fill": "warning",
  "lightbulb.fill": "lightbulb",
  "shield.fill": "shield",
  "link": "link",
  "ellipsis": "more-horiz",
  "arrow.right": "arrow-forward",
  "magnifyingglass": "search",
} as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
