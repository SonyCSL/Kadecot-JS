<template lang="jade">
span.input-group-addon JSONP
input.form-control(type="text", :value="path", v-el:input, readonly)
div.input-group-btn-fixed
  button.btn.btn-info(
    type="button", v-el:copy,
    data-toggle="tooltip", title="Copied!"
  ) #[i.fa.fa-clipboard]
div.input-group-btn-fixed(
  v-el:label,
  data-toggle="tooltip", data-placement="bottom",
  title="試しに実行できます"
)
  button.btn.btn-success(type="button", @click.prevent="[postQuery(path), hidePopup()]")
    | #[i.fa.fa-play]
</template>

<script>
import Clipboard from 'clipboard';
import url from 'url';
import path from 'path';
import JSON5 from 'json5';
import actions from '../_data-store/_actions.js';
import $ from 'jquery';

export default {
  data: () => ({
    alreadyPopuped: false
  }),
  vuex: {
    getters: {
      ip: (state) => state.ip || '',
      device: (state) => state.selectedDevice || '',
      procedure: (state) => state.selectedProcedure || '',
      params: (state) => {
        const params = state.params;
        if (!params) return {};

        const paramObj = {};
        for (let param of params) {
          if (param.type === 'raw') {
            paramObj[ param.key ] = param.value;
          } else if (param.type === 'object') {
            try {
              paramObj[ param.key ] = JSON5.parse(param.value);
            } catch (_e) {
              console.error(_e.stack || _e);
            }
          }
        }
        return paramObj;
      }
    },
    actions: actions
  },
  computed: {
    path () {
      const deviceId = (this.device.deviceId) ? this.device.deviceId.toString(10) : '';
      return url.format({
        protocol: 'http',
        hostname: this.ip,
        port: location.port,
        pathname: path.join('jsonp/v1/devices', deviceId),
        query: {
          procedure: encodeURIComponent(this.procedure),
          params: JSON.stringify(this.params)
        }
      });
    }
  },
  methods: {
    hidePopup () {
      this.alreadyPopuped = true;
      $(this.$els.label).tooltip('hide');
    }
  },
  watch: {
    procedure () {
      if (this.alreadyPopuped) return;
      $(this.$els.label).tooltip('show');
    }
  },
  ready () {
    const clipboard = new Clipboard(this.$els.copy, { target: () => this.$els.input });
    clipboard.on('success', () => {
      $(this.$els.copy).tooltip('show');
      setTimeout(() => $(this.$els.copy).tooltip('hide'), 750);
    });
    $(this.$els.copy).tooltip({ trigger: 'manual' });
    $(this.$els.label).tooltip({ trigger: 'manual', html: true });
  }
};
</script>
