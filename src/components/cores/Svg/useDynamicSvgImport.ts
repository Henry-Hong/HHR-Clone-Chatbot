import { useEffect, useRef, useState } from 'react';

export const useDynamicSvgImport = (iconName: string) => {
  const importedIconRef = useRef<React.FC<React.SVGProps<SVGElement>>>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const importIcon = async () => {
      setIsLoading(true);
      try {
        importedIconRef.current = (await import(`../../../assets/svgs/${iconName}.svg?react`)).default;
      } catch {
        importedIconRef.current = null;
      } finally {
        setIsLoading(false);
      }
    };
    importIcon();
  }, [iconName]);

  return { icon: importedIconRef.current, isLoading };
};
