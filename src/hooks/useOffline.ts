import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

import { isOnlineState, startNetState } from '@/api/netState';

/**
 * Live connectivity for the UI: `true` while the device is offline. Also feeds
 * the synchronous `netState` snapshot the http client reads on failures.
 */
export function useOffline(): boolean {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    startNetState();
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOffline(!isOnlineState(state));
    });
    return unsubscribe;
  }, []);

  return offline;
}
