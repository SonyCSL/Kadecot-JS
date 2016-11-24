<style lang="postcss" scoped>
.wrap {
  display: inline-block;
  margin: 0 10px;
}
</style>

<template lang="jade">
span Procedure
div.wrap
  input.form-control(
    type="text", :value="selectedProc", disabled
  )
</template>

<script>
export default {
  data: () => ({
    procName: null
  }),
  vuex: {
    getters: {
      selectedProc: (state) => state.selectedProcedure
    }
  }
};
</script>
