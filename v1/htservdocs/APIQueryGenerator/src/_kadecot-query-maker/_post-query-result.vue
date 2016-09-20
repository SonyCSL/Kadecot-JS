<style lang="postcss" scoped>
pre.panel-body {
  margin: 0;
  padding: 0 10px;
  border: none;
}
</style>

<template lang="jade">
div.panel.panel-default
  div#postQueryResultHeading.panel-heading
    h4.panel-title
      a(
        role="button", data-toggle="collapse", href="#postQueryResultBody"
        aria-expanded="true", aria-controls="postQueryResultBody"
      )
        | Result
  div#postQueryResultBody.panel-collapse.collapse.in(
    v-el:collapse, role="tabpanel",
    aria-labelledby="postQueryResultHeading"
  )
    pre.panel-body
      | {{{ postQueryResult | json }}}
</template>

<script>
import actions from '../_data-store/_actions.js';
import $ from 'jquery';

export default {
  vuex: {
    getters: {
      postQueryResult: (state) => state.postResult || {}
    },
    actions: actions
  },
  watch: {
    postQueryResult: {
      handler () {
        $(this.$els.collapse).collapse('show');
        const $mainContaier = $('.container-wrapper').get(0);
        const scrollPos =
          this.$el.getBoundingClientRect().top +
          $mainContaier.scrollTop +
          (- $mainContaier.getBoundingClientRect().top);
        $mainContaier.scrollTop = scrollPos;
      },
      deep: true
    }
  },
  ready () {
    $(this.$els.collapse).collapse();
    $(this.$els.collapse).collapse('hide');
  }
};
</script>
