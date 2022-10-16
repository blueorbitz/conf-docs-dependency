import { expect } from 'chai';
import { onchange } from '../src/trigger';

const MOCK_EVENT = {
  atlassianId: '70121:{{uuid}}',
  suppressNotifications: false,
  content: {
    // // Update sample
    // id: '557075',
    // type: 'page',
    // status: 'current',
    // title: 'My nested nest page',

    // Create Sample
    id: '2424833',
    type: 'page',
    status: 'current',
    title: 'Test New Page',

    space: {
      id: 65650,
      key: 'STRAWHAT',
      name: 'StrawHat',
      type: 'global',
      status: 'current'
    },
    history: {
      latest: true,
      createdBy: {},
      createdDate: '2022-10-01T15:35:19.133Z'
    }
  },
  eventType: 'avi:confluence:updated:page',
  // eventType: 'avi:confluence:created:page',
  contextToken: 'garbage-text-here',
}

describe.only('Trigger test', () => {
  it('onchange logic', async () => {
    await onchange(MOCK_EVENT, {});
  }).timeout(10000);
});