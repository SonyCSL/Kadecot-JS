import Vue from 'vue';
import $ from 'jquery';
import 'select2';

Vue.directive('select', {
  twoWay: true,
  priority: 1000,
  params: [ 'options' ],
  bind () {
    $(this.el).select2(this.params.options || { allowClear: true })
      .on('select2-close', ($event) => {
        this.set($event.target.value);
      });
    $(this.el).prev('.select2-container').find('> input').attr('readonly', true);
  },
  update (value) {
    $(this.el).val(value).trigger('change');
  },
  unbind () {
    $(this.el).off().select2('destroy');
  }
});
