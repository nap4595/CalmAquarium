/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// 개발 환경에서 성능 모니터링 활성화
if (__DEV__) {
  require('flipper-react-native');
}

AppRegistry.registerComponent(appName, () => App);