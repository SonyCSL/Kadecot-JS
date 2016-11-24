<template lang="jade">
span.input-group-addon(
  v-el:label,
  data-toggle="tooltip", data-placement="bottom",
  title="操作するデバイスを選択"
)
  | Device
select.form-control.select.select-info.left-radius-zero(
  :disabled="devices.length === 0", v-el:select,
  v-select="deviceId"
)
  option(value="null") &nbsp;
  option(
    v-for="device in devices", :value="device.deviceId",
    :selected="selectedDevice && device.deviceId === selectedDevice.deviceId"
  )
    | {{ device.nickname }}
</template>

<script>
import '../_utils/_select2SupportInVue.js';
import actions from '../_data-store/_actions.js';
import $ from 'jquery';

export default {
  data: () => ({
    selectOpts: {
      formatSelection: (data) => parseInt(data.id) || '\xA0'
    },
    deviceId: null
  }),
  vuex: {
    getters: {
      devices: (state) => state.devices,
      selectedDevice: (state) => state.selectedDevice
    },
    actions: actions
  },
  watch: {
    devices: {
      handler (devices) {
        $(this.$els.select).select2('val', 'null');
        if (devices.length !== 0) {
          $(this.$els.label).tooltip('show');
        } else {
          $(this.$els.label).tooltip('hide');
        }
      },
      deep: true
    },
    selectedDevice: {
      handler (device) {
        $(this.$els.select).select2('val', (!device) ? 'null' : device.deviceId);
        $(this.$els.label).tooltip('hide');
      },
      deep: true
    },
    deviceId (deviceId) {
      const device = this.devices.filter((i) => {
        return parseInt(i.deviceId, 10) === parseInt(deviceId, 10);
      })[0];
      this.setDevice(device);
    }
  },
  ready () {
    $(this.$els.label).tooltip({ trigger: 'manual' });
    $(this.$els.label).tooltip('hide');
  }
};
</script>
