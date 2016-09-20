<style lang="postcss" scoped>
.alert > p > button {
  margin: 5px;
}
.alert > p {
  font-size: 0.9em;
}
</style>

<template lang="jade">
.alert.alert-danger.alert-dismissible(role="alert", v-if="!hideInfo")
  p
    | #[strong Info] これは開発者用 API テストツールです．
    | Kadecot 本体の開発者モードをオンにして利用してください．
  p
    button.btn.btn-danger(
      type="button", data-dismiss="alert", aria-label="Close"
    )
      | 了解
    button.btn.btn-default(
      type="button", data-dismiss="alert", aria-label="Close",
      @click="hideFirstInfoForever"
    )
      | 次回から表示しない
</template>

<script>
import actions from '../_data-store/_actions.js';

const STATUS = {
  PENDING: 0,
  TYPING: 100,
  SUCCESS: 200,
  FAILED: 500
};

export default {
  vuex: {
    getters: {
      hideInfoConf: (state) => state.hideFirstInfo,
      status: (state) => state.status
    },
    actions: actions
  },
  watch: {
    status (status) {
      if (status === STATUS.SUCCESS) {
        this.hideFirstInfo();
      }
    }
  },
  computed: {
    hideInfo () {
      return this.hideInfoConf;
    }
  }
};
</script>
