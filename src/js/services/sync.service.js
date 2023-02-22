import { services } from './sync/index.js';
import { OPTS } from '../lib/options.js';

export const getAvailableServices = () => {
  // TODO: Validate services
  return services.map(serviceDetails => {
    return {
      id: serviceDetails.name,
      friendlyName: serviceDetails.friendlyName,
      settings: serviceDetails.settings,
    };
  });
};

const getService = () => {
  return new (services.find(serviceDetails => {
    return serviceDetails.name === OPTS.sync.provider;
  })).Service(OPTS.sync.settings[OPTS.sync.provider]);
};

export const getFullContent = () => {
  return getService().getFullContent();
};

export const setFullContent = content => {
  return getService().setFullContent(content);
};
