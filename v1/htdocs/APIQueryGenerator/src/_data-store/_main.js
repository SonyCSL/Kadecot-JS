import Vue from 'vue';
import Vuex from 'vuex';
import state from './_state.js';
import actions from './_actions.js';
import mutations from './_mutations.js';

Vue.use(Vuex);

export default new Vuex.Store({
  state,
  mutations,
  actions
});
