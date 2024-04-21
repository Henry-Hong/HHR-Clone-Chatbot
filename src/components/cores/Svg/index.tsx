import React, { ComponentProps, Suspense } from 'react';
import { TypeIconName } from './types.ts';

import _ from 'lodash';

interface ISvgProps {
  iconName: TypeIconName;
  svgProps?: ComponentProps<'svg'>;
}

const Svg = React.memo(
  function ({ iconName, svgProps }: ISvgProps) {
    const Component = React.lazy(() => import(`../../../assets/svgs/${iconName}.svg?react`));
    return (
      <Suspense fallback={<div className="w-[24px] h-[24px]"></div>}>
        <Component {...svgProps} />
      </Suspense>
    );
  },
  (prev, next) => prev.iconName === next.iconName && _.isEqual(prev.svgProps, next.svgProps)
);

export default Svg;
