import { cva } from "class-variance-authority";
import React, { ComponentPropsWithoutRef, ElementType } from "react";
import { twMerge as tw } from "tailwind-merge";

type TypeFlexVariants =
  | "verticalLeft"
  | "verticalCenter"
  | "verticalRight"
  | "horizontalLeft"
  | "horizontalCenter"
  | "horizontalRight";

const FlexVariants = cva("flex", {
  variants: {
    intents: {
      verticalLeft: "flex-col items-start",
      verticalCenter: "flex-col items-center",
      verticalRight: "flex-col items-end",
      horizontalLeft: " justify-start items-center",
      horizontalCenter: " justify-center items-center",
      horizontalRight: " justify-end items-center",
    },
  },
  defaultVariants: {
    intents: "horizontalLeft",
  },
});

type TypeFlexProps<T extends ElementType> = {
  children?: React.ReactNode;
  as?: T;
  variants?: TypeFlexVariants;
  className?: string;
} & ComponentPropsWithoutRef<T>;

export default function Flex<T extends ElementType = "div">({
  children,
  as,
  variants,
  className,
  ...rest
}: TypeFlexProps<T>) {
  const Component = as || "div";
  return (
    <Component
      className={tw(FlexVariants({ intents: variants }), className)}
      {...rest}
    >
      {children}
    </Component>
  );
}
