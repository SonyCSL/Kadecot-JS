import jsonp from '../_utils/_jsonpPromise.js';

const SETTER = {
  SET_AVAILABLE_DEVICES (state, devices) {
    state.availableDevices = devices;
  },
  SET_STATUS (state, statusCode) {
    state.status = statusCode;
  },
  SET_SELECTED_DEVICE (state, device) {
    state.selectedDevice = device;
  },
  SET_DEVICE_METHODS (state, methods) {
    state.deviceMethods = methods;
  },
  SET_SELECTED_PROCEDURE (state, procedure) {
    state.selectedProcedure = procedure;
  },
  SET_SELECTED_METHOD (state, method) {
    state.selectedMethod = method;
  }
};

const CLEARER = {
  CLEAR_DEVICE_LIST (state) {
    state.devices = [];
  },
  CLEAR_SELECTED_DEVICE (state) {
    state.selectedDevice = null;
  },
  CLEAR_DEVICE_METHOD (state) {
    state.deviceMethods = null;
  },
  CLEAR_SELECTED_PROCEDURE (state) {
    state.selectedProcedure = null;
  },
  CLEAR_SELECTED_METHOD (state) {
    state.selectedMethod = null;
  },
  CLEAR_DEFAULT_PARAMS (state) {
    state.defaultParams = null;
  }
};

export default Object.assign({
  HIDE_FIRST_INFO (state, forever) {
    state.hideFirstInfo = true;
    if (forever) localStorage.setItem('hideFirstInfo', true);
  },
  UPDATE_IP (state, ip) {
    state.ip = ip;
  },
  UPDATE_PARAMS (state, params) {
    state.params = params;
  },
  SET_DEFAULT_PARAMS (state, params) {
    state.defaultParams = params;
  },
  ADD_DEVICE_LIST (state, devices) {
    state.devices = ( state.devices || [] ).concat(devices);
  },
  REQUEST_JSONP (state, url) {
    state.postResult = 'Loading...';
    jsonp(url)
      .then((data) => {
        state.postResult = data;
      })
      .catch(() => {
        state.postResult = 'Error. Please check url.';
      });
  }
}, SETTER, CLEARER);
