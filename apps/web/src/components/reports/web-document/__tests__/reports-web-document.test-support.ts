import * as React from "react";

export type TestDomElementProps = {
  children?: React.ReactNode;
  onClick?: (...args: unknown[]) => void;
  onChange?: (...args: unknown[]) => void;
  role?: string;
  type?: string;
};

export function collectDomElements(
  node: React.ReactNode,
): React.ReactElement<TestDomElementProps>[] {
  if (!React.isValidElement(node)) {
    return [];
  }

  const element = node as React.ReactElement<TestDomElementProps>;

  if (typeof element.type === "function") {
    const component = element.type as (props: TestDomElementProps) => React.ReactNode;
    return collectDomElements(component(element.props));
  }

  return [
    element,
    ...React.Children.toArray(element.props.children).flatMap(collectDomElements),
  ];
}
