import jsonp from '../_utils/_jsonpPromise.js';
import axios from 'axios';
import YAML from 'yamljs';

const STATUS = {
  PENDING: 0,
  TYPING: 100,
  SUCCESS: 200,
  FAILED: 500
};

const actions = {
  fetchAvailableDevices: ({ dispatch }) => {
    axios.get('assets/yaml/devicelist.yml', {
      responseType: 'text'
    })
      .then((res) => {
        if (res.status !== 200) return;
        res.data = YAML.parse(res.data);
        dispatch('SET_AVAILABLE_DEVICES', res.data);
      })
      .catch(() => {
        window.alert('YAML data is not found.\nデータベースが用意されていません．');
      });
  },
  fetchDevicesInKadecot: ({ dispatch, state }) => {
    jsonp(`http://${ state.ip }:31413/jsonp/v1/devices/`)
      .then((data) => {
        return data.deviceList.filter((d) => {
          const isAvailable =
            state.availableDevices[ d.protocol ] &&
            state.availableDevices[ d.protocol ].includes( d.deviceType );
          return isAvailable;
        });
      })
      .then((data) => {
        actions.clearDeviceList({ dispatch });
        actions.addDeviceList({ dispatch }, data);
        actions.setStatus({ dispatch }, STATUS.SUCCESS);
      })
      .catch((_e) => {
        console.error(_e.stack || _e);
      });
  },
  updateIP: ({ dispatch }, ip) => {
    // actions.clearDeviceList({ dispatch });
    dispatch('UPDATE_IP', ip);
  },
  updateParams: ({ dispatch }, params) => {
    dispatch('UPDATE_PARAMS', params);
  },
  setDefaultParams: ({ dispatch }, params) => {
    dispatch('SET_DEFAULT_PARAMS', params);
  },
  setStatus: ({ dispatch }, status) => dispatch('SET_STATUS', status),
  clearDeviceList: ({ dispatch }) => {
    dispatch('CLEAR_DEVICE_LIST');
    dispatch('CLEAR_SELECTED_DEVICE');
    dispatch('CLEAR_SELECTED_PROCEDURE');
    dispatch('CLEAR_SELECTED_METHOD');
    dispatch('CLEAR_DEFAULT_PARAMS');
  },
  addDeviceList: ({ dispatch }, devices) => dispatch('ADD_DEVICE_LIST', devices),
  setProcedure: ({ dispatch, state }, proc) => {
    dispatch('SET_SELECTED_PROCEDURE', proc);
    const params = state.selectedMethod.params || {};
    const parsedParams = [];
    Object.keys(params).forEach((name) => {
      const param = {
        key: name,
        type: null,
        value: null,
        editable: !params[name].const,
        required: (params[name].required === false) ? false : true
      };
      if (['string', 'number'].includes(params[name].type)) {
        param.type = 'raw';
        param.value = params[name].value;
      } else {
        param.type = 'object';
        param.value = JSON.stringify(params[name].value);
      }
      parsedParams.push(param);
    });

    dispatch('SET_DEFAULT_PARAMS', parsedParams);
  },
  setMethod: ({ dispatch, state }, methodName) => {
    if (!state.deviceMethods[ methodName ]) return;
    const method = state.deviceMethods[ methodName ];
    dispatch('SET_SELECTED_METHOD', method);
    actions.setProcedure({ dispatch, state }, method.procedure);
  },
  setDevice: ({ dispatch }, device) => {
    if (!device) return;
    dispatch('CLEAR_SELECTED_METHOD');
    dispatch('CLEAR_SELECTED_PROCEDURE');
    dispatch('CLEAR_DEFAULT_PARAMS');
    dispatch('SET_SELECTED_DEVICE', device);
    axios.get(`assets/yaml/${device.protocol}/${device.deviceType}.yml`, {
      responseType: 'text'
    })
      .then((res) => {
        if (res.status !== 200) return;
        res.data = YAML.parse(res.data);
        dispatch('SET_DEVICE_METHODS', res.data.rpc);
      })
      .catch(() => {
        window.alert('YAML data is not found.\nデータベースが用意されていません．');
        dispatch('CLEAR_SELECTED_DEVICE');
      });
  },
  postQuery: ({ dispatch }, url) => {
    dispatch('REQUEST_JSONP', url);
  },
  hideFirstInfo: ({ dispatch }) => {
    dispatch('HIDE_FIRST_INFO');
  },
  hideFirstInfoForever: ({ dispatch }) => {
    dispatch('HIDE_FIRST_INFO', true);
  }
};

export default actions;
