import { useEffect, useState } from 'react';

/**
 * Хост для порталов: элемент в <body> с `display: contents` (не влияет на раскладку и стекинг) и
 * заданными атрибутами/переменными. Всплывающее внутри скоупа порталится в него и наследует акцент
 * и тему, оставаясь при этом вне любых overflow/transform/backdrop-filter родителей. `parent` — хост
 * внешнего скоупа: вложенный хост внутри него наследует и его переменные.
 */
export function usePortalHost(
  dataset: Record<string, string>,
  cssVars: Record<string, string>,
  parent?: HTMLElement | null,
): HTMLElement | null {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const element = document.createElement('div');

    element.style.display = 'contents';
    (parent ?? document.body).appendChild(element);
    setHost(element);

    return () => {
      element.remove();
      setHost(null);
    };
  }, [parent]);

  // Зависимости — сериализованные значения: объекты собираются заново на каждом рендере
  const datasetKey = JSON.stringify(dataset);
  const cssVarsKey = JSON.stringify(cssVars);

  useEffect(() => {
    if (!host) return;

    const nextDataset = JSON.parse(datasetKey) as Record<string, string>;
    const nextVars = JSON.parse(cssVarsKey) as Record<string, string>;

    for (const [key, value] of Object.entries(nextDataset)) host.dataset[key] = value;
    for (const [key, value] of Object.entries(nextVars)) host.style.setProperty(key, value);

    return () => {
      for (const key of Object.keys(nextDataset)) delete host.dataset[key];
      for (const key of Object.keys(nextVars)) host.style.removeProperty(key);
    };
  }, [host, datasetKey, cssVarsKey]);

  return host;
}
