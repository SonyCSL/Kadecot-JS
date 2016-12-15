<style src="./_base.pcss"></style>
<style lang="postcss" scoped>
  .app-title {
    white-space: nowrap;
  }
  .navbar {
    background: #fafafa;
    margin: 0;
    border-bottom: 1px solid #aaa;
    height: 110px;
  }
  .main-container {
    padding-top: 110px;
    height: 100%;
    box-sizing: border-box;
  }
  .container-wrapper {
    height: 100%;
    overflow-y: scroll;
  }
  .row {
    margin: 10px 0;
  }
  main section {
    padding: 0 10px;
  }
</style>

<template lang="jade">
nav.navbar.navbar-fixed-top
  div.container
    div.row
      div.col-xs-12.app-title
        p #[strong Kadecot API Query Maker]
      div.col-xs-12.input-group
        jsonp-path
main.main-container
  div.container-wrapper
    div.container
      div.row
        div.col-xs-12
          information
      div.row
        section.col-xs-12.col-md-6
          div.row
            div.col-xs-12.input-group
              base-url-form
          div.row
            div.col-xs-12.input-group
              devices-dropdown
          div.row
            div.col-xs-12.input-group
              methods-dropdown
          div.row
            div.col-xs-12
              params-form
        section.col-xs-12.col-md-6
          div.row
            div.col-xs-12
              params-description
            div#results.col-xs-12
              post-query-result
</template>

<script>
import BaseUrlFormVue from './_kadecot-query-maker/_base-url-form.vue';
import DevicesDropdownVue from './_kadecot-query-maker/_devices-dropdown.vue';
import MethodsDropdownVue from './_kadecot-query-maker/_methods-dropdown.vue';
import ParamsFormVue from './_kadecot-query-maker/_params-form.vue';
import JsonpPathVue from './_kadecot-query-maker/_jsonp-path.vue';
import ParamsDescriptionVue from './_kadecot-query-maker/_params-description.vue';
import PostQueryResultVue from './_kadecot-query-maker/_post-query-result.vue';
import InformationVue from './_kadecot-query-maker/_information.vue';
import actions from './_data-store/_actions.js';

export default {
  vuex: {
    actions: actions
  },
  components: {
    'base-url-form': BaseUrlFormVue,
    'devices-dropdown': DevicesDropdownVue,
    'methods-dropdown': MethodsDropdownVue,
    'params-form': ParamsFormVue,
    'jsonp-path': JsonpPathVue,
    'params-description': ParamsDescriptionVue,
    'post-query-result': PostQueryResultVue,
    'information': InformationVue
  },
  created () {
    this.fetchAvailableDevices();
  }
};
</script>
