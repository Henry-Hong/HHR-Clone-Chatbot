import React, { ComponentProps } from 'react';
import { TypeIconName } from './types.ts';

import _ from 'lodash';
import { useDynamicSvgImport } from './useDynamicSvgImport.ts';

interface ISvgProps {
  iconName: TypeIconName;
  svgProps?: ComponentProps<'svg'>;
}

const Svg = React.memo(
  function ({ iconName, svgProps }: ISvgProps) {
    const { icon: Component } = useDynamicSvgImport(iconName);
    return Component ? <Component {...svgProps} /> : <div className="w-[24px] h-[24px]" />;
  },
  (prev, next) => prev.iconName === next.iconName && _.isEqual(prev.svgProps, next.svgProps)
);

export default Svg;
