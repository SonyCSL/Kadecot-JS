<style lang="postcss" scoped>
.panel-collapse {
  resize: vertical;
  min-height: 300px;
  height: 300px;
  overflow-y: scroll;
  overflow-x: hidden;
}
.panel-body {
  margin: 10px 20px;
  padding: 0;
}
</style>

<template lang="jade">
div.panel.panel-default
  div#methodDescriptionHeading.panel-heading
    h4.panel-title
      a(
        role="button", data-toggle="collapse", href="#methodDescriptionBody"
        aria-expanded="true", aria-controls="methodDescriptionBody"
      )
        | Info | {{ selectedMethod.name || "Description" }}
  div#methodDescriptionBody.panel-collapse.collapse(
    v-el:collapse, role="tabpanel",
    aria-labelledby="methodDescriptionHeading"
  )
    div.panel-body.markdown-body
      | {{{ doc }}}
</template>

<script>
import actions from '../_data-store/_actions.js';
import $ from 'jquery';
import marked from 'marked';
import htmlescape from 'escape-html';

export default {
  vuex: {
    getters: {
      selectedMethod: (state) => state.selectedMethod || {}
    },
    actions: actions
  },
  computed: {
    doc () {
      if (this.selectedMethod.docType === 'markdown') {
        return marked(this.selectedMethod.doc);
      } else {
        return htmlescape(this.selectedMethod.doc || '').replace(/\n/g, '<br/>');
      }
    }
  },
  ready () {
    $(this.$els.collapse).collapse();
  }
};
</script>
