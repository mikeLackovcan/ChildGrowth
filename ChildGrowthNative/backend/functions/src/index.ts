import { setGlobalOptions } from 'firebase-functions/v2';
setGlobalOptions({ region: 'europe-west1', maxInstances: 3, memory: '256MiB', timeoutSeconds: 30 });
export { listFamilyOpponents, createFamilyBattle, respondFamilyBattle, playFamilyBattleMove, leaveFamilyBattle } from './battles';
export { manageFamily } from './family';
export { initializeAccount, updateNickname, resolveFamilyAccount, recoverLegacyProgress, getFamilyStatus } from './accounts';
export { applyProgress } from './progress';
export { registerPushDevice, unregisterPushDevice, notifyFamilyProgress, preparePush, deliverPush, retryPushDelivery, cleanPushHistory } from './push';
