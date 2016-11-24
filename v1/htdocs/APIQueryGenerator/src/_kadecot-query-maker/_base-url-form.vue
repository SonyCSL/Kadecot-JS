<style lang="postcss" scoped>
.form-control:focus {
  border-color: #bdc3c7;
}
</style>

<template lang="jade">
validator(name="IPAddrValid")
  span.input-group-addon Kadecot IP
  input.form-control(
    type="text", placeholder="Kadecot(開発者モード)のIPアドレス",
    :value="ip", v-validate:ip="[ 'ip', 'connect' ]",
    @input="updateIP($event.target.value)", v-el:input,
    data-toggle="tooltip", data-placement="bottom",
    title="Kadecot(開発者モード)のIPアドレスを入力"
  )
  div.input-group-btn-fixed
    button.btn.btn-primary(type="button", @click.prevent="fetchDevicesInKadecot()")
      | #[i.fa.fa-refresh]
</template>

<script>
import actions from '../_data-store/_actions.js';
import { isIP } from 'validator';
import qs from 'querystring';
import $ from 'jquery';

const STATUS = {
  PENDING: 0,
  TYPING: 100,
  SUCCESS: 200,
  FAILED: 500
};

export default {
  vuex: {
    getters: {
      ip: (state) => state.ip,
      status: (state) => state.status,
      devices: (state) => state.devices,
      availableDevices: (state) => state.availableDevices
    },
    actions: actions
  },
  validators: {
    ip: {
      check (val) {
        return isIP(val, 4) || val.toLowerCase() === 'localhost';
      },
      message: 'Invalid IP format.'
    },
    connect: {
      check () { return (this.vm.status !== STATUS.FAILED); },
      message: 'Can\'t access. Please check kadecot IP.'
    }
  },
  watch: {
    ip () {
      this.clearDeviceList();
      this.setStatus(STATUS.TYPING);
      $(this.$els.input).tooltip('show');
      if (this.$IPAddrValid.valid) this.fetchDevicesInKadecot();
    },
    status (status) {
      if (status === STATUS.SUCCESS) {
        $(this.$els.input).tooltip('hide');
        this.$els.input.blur();
      }
    }
  },
  ready () {
    $(this.$els.input).tooltip({ trigger: 'manual' });
    $(this.$els.input).tooltip('show');
    const q = qs.parse(location.search.substr(1));
    if (q.hasOwnProperty('k')) {
      this.updateIP(q.k);
      this.fetchDevicesInKadecot();
    }
  }
};
</script>
