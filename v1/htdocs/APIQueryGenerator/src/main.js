import Vue from 'vue';
import VueValidator from 'vue-validator';
import store from './_data-store/_main.js';
import kadecotQueryGeneratorVue from './_kadecot-query-generator.vue';
import 'jquery';
import 'bootstrap';

Vue.use(VueValidator);
Vue.component('query-generator', kadecotQueryGeneratorVue);

new Vue({
  el: 'body',
  store: store
});
