<style scoped>
.radius-zero > * {
  border-radius: 0;
}
.top-radius-zero > * {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}
.bottom-radius-zero > * {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}
.form-wrapper {
  padding: 10px 0;
}
.info {
  min-width: 70px;
}
</style>

<template lang="jade">
p Parameters
template(v-if="params && params.length !== 0" v-for="param in params")
  div.form-wrapper
    div.col-xs-12.input-group.bottom-radius-zero
      span.input-group-addon.info Key
      input.form-control(
        type="text", placeholder="key", v-model="param.key",
        :disabled="param.required || !param.editable"
      )
    div.col-xs-12.input-group.top-radius-zero
      span.input-group-addon.info Value
      input.form-control(
        type="text", placeholder="value", v-model="param.value",
        :disabled="!param.editable"
      )
template(v-if="!params || params.length === 0")
  pre Parameter is not required.
</div>
</template>

<script>
import '../_utils/_select2SupportInVue.js';
import actions from '../_data-store/_actions.js';
import { isArray } from 'jquery';

export default {
  data: () => ({
    params: []
  }),
  vuex: {
    getters: {
      defaultParams: (state) => state.defaultParams
    },
    actions: actions
  },
  watch: {
    defaultParams: {
      handler (defaultParams) {
        this.params = defaultParams;
        this.updateParams(this.params);
      },
      deep: true
    },
    params: {
      handler (params) {
        this.updateParams(params);
      },
      deep: true
    }
  },
  methods: {
    addEmptyParam () {
      this.params.push({ key: '', value: '', type: 'raw', required: false, editable: true });
    },
    removeParam (param) {
      this.params.$remove(param);
    },
    isArray: isArray
  }
};
</script>
