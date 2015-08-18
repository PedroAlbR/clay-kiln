/*
Simple List arguments

min {number} minimum number of items required
max {number} maximum number of items allowed

 */

var _ = require('lodash'),
  keycode = require('keycode'),
  dom = require('../services/dom'),
  focus = require('../decorators/focus');

module.exports = function (result) {
  var name = result.name,
    el = dom.create(`
      <section data-field="${name}" class="simple-list" rv-simplelist="${name}.data">
        <span tabindex="0" rv-each-item="${name}.data" class="simple-list-item" rv-class-selected="item._selected" rv-on-click="${name}.selectItem" rv-on-keydown="${name}.keyactions">{ item.text }</span>
        <input class="simple-list-add" rv-on-click="${name}.unselectAll" placeholder="Start typing here&hellip;" />
      </section>`);

  /**
   * unselect all items
   * @param  {[]} items
   * @return {[]}
   */
  function unselectAll(items) {
    return items.map(function (item) {
      item._selected = false;
      return item;
    });
  }

  /**
   * unselect all items, then select a specific item
   * @param  {{ item: {}, data: []}} bindings
   */
  function selectItem(bindings) {
    var item = bindings.item,
      data = bindings.data;

    unselectAll(data);
    item._selected = true;
  }

  /**
   * select previous item in list
   * @param  {Event} e
   * @param  {number} index
   * @param  {{item: {}, data: []}} bindings
   */
  function selectPrevious(e, index, bindings) {
    if (index > 0 && e.target.previousSibling) {
      selectItem({ item: bindings.data[index - 1], data: bindings.data });
      e.target.previousSibling.focus();
    }
  }

  /**
   * select next item in list
   * @param  {Event} e
   * @param  {number} index
   * @param  {{item: {}, data: []}} bindings
   */
  function selectNext(e, index, bindings) {
    var input = dom.find(el, '.simple-list-add');

    if (index < bindings.data.length - 1) {
      e.preventDefault(); // kill that tab!
      selectItem({ item: bindings.data[index + 1], data: bindings.data });
      e.target.nextSibling.focus();
    } else {
      // we currently have the last item selected, so focus the input
      e.preventDefault();
      e.stopPropagation(); // stop the current event first
      input.dispatchEvent(new Event('click'));
      input.focus();
    }
  }

  /**
   * remove item from list
   * @param  {Event} e
   * @param  {number} index
   * @param  {{item: {}, data: []}} bindings
   */
  function deleteItem(e, index, bindings) {
    var prevSibling = e.target.previousSibling;

    e.preventDefault(); // prevent triggering the browser's back button
    bindings.data.splice(index, 1); // remove item from the list

    if (index > 0) {
      prevSibling.focus();
      prevSibling.dispatchEvent(new Event('click'));
    }
  }

  /*
  Click Handlers
   */

  // unselect all items when you click to add a new one
  result.bindings.unselectAll = function (e, bindings) {
    unselectAll(bindings.data);
  };

  // select an item (and unselect all others) when you click it
  result.bindings.selectItem = function (e, bindings) {
    selectItem(bindings);
  };

  // move between items and delete items when pressing the relevant keys (when an item is selected)
  result.bindings.keyactions = function (e, bindings) {
    var key = keycode(e),
      index = bindings.data.indexOf(bindings.item);

    if (key === 'left') {
      selectPrevious(e, index, bindings);
    } else if (key === 'tab' || key === 'right') {
      selectNext(e, index, bindings);
    } else if (key === 'delete' || key === 'backspace') {
      deleteItem(e, index, bindings);
    }
  };

  // put the element into the result object
  result.el = el;

  // add binder for creating new items
  result.binders.simplelist = {
    publish: true,
    bind: function (boundEl) {
      // this is called when the binder initializes
      var addEl = dom.find(boundEl, '.simple-list-add'),
        observer = this.observer;

      // add new item from the add-items field
      function addItem(e) {
        var data = observer.value(),
          newText = { text: addEl.value }; // get the new item text

        // prevent creating newlines or tabbing out of the field
        if (e) {
          e.preventDefault();
        }

        if (addEl.value.length) {
          addEl.value = ''; // remove it from the add-item field
          data.push(newText); // put it into the data
          observer.setValue(data);
        } else {
          // close the form
          focus.unfocus();
        }
      }

      // select the last item when you backspace from the add-items field
      function selectLastItem(e) {
        var data = observer.value(),
          newItems = dom.findAll(boundEl, '.simple-list-item');

        if (!addEl.value || !addEl.value.length) {
          e.preventDefault(); // prevent triggering the browser's back button
          _.last(data)._selected = true;
          _.last(newItems).focus(); // focus on the last item
          observer.setValue(data);
        }
      }

      // handle keyboard events in the add-items field
      function handleItemKeyEvents(e) {
        var key = keycode(e);

        if (key === 'enter' || key === 'tab') {
          addItem(e);
        } else if (key === 'delete' || key === 'backspace' || key === 'left') {
          selectLastItem(e);
        }
      }

      addEl.addEventListener('keydown', handleItemKeyEvents);
    }
  };

  return result;
};
