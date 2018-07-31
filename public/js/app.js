/* eslint-env browser */
/* global $ */
function deleteEntry (groupId, Uuid) {
  if (confirm('Really delete')) {
    window.location = `delete/${groupId}/${Uuid}`;
  }
}
$(() => {
  $('[contenteditable]').keypress(e => e.which !== 13);
  let saveEvt = event => {
    $.post('./edit', {
      id: $(event.target).parents('.members').data('id'),
      memberId: $(event.target).parents('.member').data('memberId'),
      uuid: $(event.target).parents('.entry').data('uuid'),
      description: $(event.target).parents('tr').find('.description').val(),
      amount: $(event.target).parents('tr').find('.amount').val()
    }).then(() => {
      window.location.reload();
    });
  };
  $('.save').click(saveEvt);
  $('.entry, amount').keypress(event => {
    if (event.which === 13) {
      saveEvt(event);
    }
  });
});
