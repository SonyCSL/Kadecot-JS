<style lang="postcss" scoped>
.wrap {
  display: inline-block;
  margin: 0 10px;
}
</style>

<template lang="jade">
span.input-group-addon(
  v-el:label,
  data-toggle="tooltip", data-placement="bottom",
  title="実行するメソッドを選択"
)
  | Method
select.form-control.select.select-info.left-radius-zero(
  v-select="methodIdx",
  :disabled="!device", v-el:select
)
  option(value="null") &nbsp;
  option(
    v-for="method in methods",
    :value="$index", :selected="!device"
  )
    | {{ method }}
</template>

<script>
import '../_utils/_select2SupportInVue.js';
import $ from 'jquery';
import actions from '../_data-store/_actions.js';

export default {
  data: () => ({
    methodIdx: null
  }),
  vuex: {
    getters: {
      device: (state) => state.selectedDevice,
      methods: (state) => Object.keys(state.deviceMethods),
      selectedMethod: (state) => state.selectedMethod
    },
    actions: actions
  },
  watch: {
    methodIdx (idx) {
      if (!idx) return;
      this.setMethod(this.methods[idx]);
    },
    device: {
      handler (device) {
        if (device) {
          $(this.$els.label).tooltip('show');
        } else {
          $(this.$els.label).tooltip('hide');
        }
      },
      deep: true
    },
    selectedMethod: {
      handler (val) {
        if (!val) {
          $(this.$els.select).select2('val', 'null');
          this.methodIdx = null;
        } else {
          $(this.$els.label).tooltip('hide');
        }
      },
      deep: true
    }
  },
  ready () {
    $(this.$els.label).tooltip({ trigger: 'manual' });
    $(this.$els.label).tooltip('hide');
  }
};
</script>
