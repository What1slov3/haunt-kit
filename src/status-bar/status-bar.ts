import { StatusBarItem, StatusBarRoot } from './status-bar-parts';

/** Собирается в .ts, чтобы компонент-файл экспортировал только компоненты (react-refresh) */
export const StatusBar = Object.assign(StatusBarRoot, { Item: StatusBarItem });
